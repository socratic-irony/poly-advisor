import { useState, useRef, useEffect } from 'react';
import OpenAI from 'openai';
import { Message, ToolStatus, ToolUsed } from '../types';
import { parseEmlFile, readFileAsText } from '../utils/emlParser';
import { stripHtml } from '../utils/stripHtml';
import { getChatErrorMessage } from '../utils/chatError';
import { ALLOWED_DOMAINS } from '../config/search';
import { createDeveloperPrompt, createEmailThreadPrompt, createSystemPrompt } from '../utils/chatPrompts';
import { executeGuidanceToolCall, guidanceSearchTool } from '../utils/guidanceTool';
import { cleanMarkdown } from '../utils/markdown';
import { extractResponseText, extractUniqueSources, filterUrlCitations } from '../utils/responseParser';
import { estimateCostUsd } from '../utils/cost';

const readUsageTokens = (response: unknown): { input: number; cached: number; output: number } => {
  const usage = (response as any)?.usage;
  if (!usage || typeof usage !== 'object') return { input: 0, cached: 0, output: 0 };
  const details = usage.input_tokens_details;
  return {
    input: typeof usage.input_tokens === 'number' ? usage.input_tokens : 0,
    cached:
      details && typeof details === 'object' && typeof details.cached_tokens === 'number'
        ? details.cached_tokens
        : 0,
    output: typeof usage.output_tokens === 'number' ? usage.output_tokens : 0,
  };
};

const isEmailThread = (text: string): boolean => {
  return /^(from|subject|date|to):/im.test(text) || /On .* wrote:/i.test(text);
};

const nextFrame = () =>
  new Promise<void>((resolve) => {
    let settled = false;
    const settle = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(settle);
    }
    setTimeout(settle, 250);
  });

const MAX_GUIDANCE_TOOL_TURNS = 3;
const RESPONSE_TIMEOUT_MS = 120_000;

const guidanceDocumentFromArguments = (argumentsJson: unknown): 'phil' | 'cla' | 'both' | null => {
  try {
    const parsed = JSON.parse(typeof argumentsJson === 'string' ? argumentsJson : '{}');
    return parsed?.document === 'phil' || parsed?.document === 'cla' || parsed?.document === 'both'
      ? parsed.document
      : null;
  } catch {
    return null;
  }
};

const guidanceStatusForDocuments = (documents: Set<'phil' | 'cla'>): ToolStatus | null => {
  if (documents.has('phil') && documents.has('cla')) return 'both_guidance';
  if (documents.has('phil')) return 'phil_guidance';
  if (documents.has('cla')) return 'cla_guidance';
  return null;
};

export function useChat(
  model: string,
  searchDepth: 'medium' | 'high',
  forceSearch: boolean
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeToolStatus, setActiveToolStatus] = useState<ToolStatus | null>(null);
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const [streamingMessageIndex, setStreamingMessageIndex] = useState<number | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const createClient = (): OpenAI => {
    let savedKey: string | null = null;

    try {
      savedKey = window.localStorage?.getItem('openai_key') ?? null;
    } catch (error) {
      console.error('Unable to access localStorage', error);
      throw new Error(
        'Unable to access browser storage for your API key. Please allow storage access or paste your key again.'
      );
    }

    if (!savedKey) {
      throw new Error('Please add your OpenAI API key first.');
    }

    return new OpenAI({
      apiKey: savedKey,
      dangerouslyAllowBrowser: true,
    });
  };

  const createSystemContent = (includeTimestampNote = false): Array<{ type: "input_text"; text: string }> => {
    return [{
      type: "input_text" as const,
      text: createSystemPrompt(searchDepth, includeTimestampNote),
    }];
  };

  const createDeveloperContent = (chatMode = false): Array<{ type: "input_text"; text: string }> => {
    return [{ type: "input_text" as const, text: createDeveloperPrompt(chatMode) }];
  };

  const fetchSuggestions = async (
    question: string,
    answer: string,
    onUsage?: (inputTokens: number, outputTokens: number) => void
  ): Promise<string[]> => {
    try {
      const client = createClient();
      const response = await client.responses.create({
        model,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text" as const,
                text: "Generate two brief follow-up questions a student might ask next based on the conversation. Return them as plain text only. Do not use Markdown, bullets, numbering, quotes, or special formatting."
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text" as const,
                text: `Original question: ${question}\nAnswer: ${answer}\nProvide two follow-up questions as plain text only.`
              }
            ]
          }
        ]
      }, { timeout: RESPONSE_TIMEOUT_MS });

      const usage = readUsageTokens(response);
      onUsage?.(usage.input, usage.output);

      const { text } = extractResponseText(response);

      return text
        .split('\n')
        .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 2);
    } catch (e) {
      console.error('Error generating suggestions', e);
      return [];
    }
  };

  const addAssistantPlaceholder = (userMessage?: Message): number => {
    const assistantIndex = messages.length + (userMessage ? 1 : 0);
    setMessages((prev) => {
      const base = userMessage ? [...prev, userMessage] : [...prev];
      return [...base, { role: 'assistant', content: '', sources: undefined }];
    });
    setStreamingMessageIndex(assistantIndex);
    return assistantIndex;
  };

  const streamContentToMessage = async (
    assistantMessageIndex: number,
    text: string,
    sources?: Message['sources'],
    toolsUsed?: Message['toolsUsed']
  ) => {
    const totalLength = text.length;

    if (totalLength === 0) {
      setMessages((prev) =>
        prev.map((msg, idx) =>
          idx === assistantMessageIndex
            ? {
                ...msg,
                content: text,
                sources: sources && sources.length > 0 ? sources : undefined,
                toolsUsed,
              }
            : msg
        )
      );
      return;
    }

    const updateCount = Math.min(10, Math.max(1, Math.ceil(totalLength / 200)));
    const step = Math.ceil(totalLength / updateCount);

    for (let i = 1; i <= updateCount; i++) {
      const sliceIndex = Math.min(totalLength, i * step);
      const partial = text.slice(0, sliceIndex);
      const isLast = i === updateCount;

      setMessages((prev) =>
        prev.map((msg, idx) =>
          idx === assistantMessageIndex
            ? {
                ...msg,
                content: partial,
                sources: isLast && sources && sources.length > 0 ? sources : msg.sources,
                toolsUsed: isLast ? toolsUsed : msg.toolsUsed,
              }
            : msg
        )
      );

      if (!isLast) {
        await nextFrame();
      }
    }
  };

  const handleAssistantError = (assistantMessageIndex: number, error: unknown) => {
    console.error('Error:', error);
    const errorMessage: Message = {
      role: 'assistant',
      content: getChatErrorMessage(error),
      isError: true,
    };

    if (assistantMessageIndex >= 0) {
      setMessages((prev) =>
        prev.map((msg, idx) => (idx === assistantMessageIndex ? errorMessage : msg))
      );
    } else {
      setMessages((prev) => [...prev, errorMessage]);
    }

    setStreamingMessageIndex(null);
  };

  const runAssistantFlow = async (options: {
    assistantMessageIndex: number;
    userContent: string;
    suggestionsSeed: string;
    includeTimestampNote: boolean;
    developerChatMode: boolean;
  }) => {
    const { assistantMessageIndex, userContent, suggestionsSeed, includeTimestampNote, developerChatMode } = options;

    setActiveToolStatus(forceSearch ? 'web_search' : 'thinking');
    await nextFrame();

    const startedAt = Date.now();
    let usageInputTokens = 0;
    let usageCachedTokens = 0;
    let usageOutputTokens = 0;
    const accumulateUsage = (response: unknown) => {
      const usage = readUsageTokens(response);
      usageInputTokens += usage.input;
      usageCachedTokens += usage.cached;
      usageOutputTokens += usage.output;
    };

    const client = createClient();
    const webSearchTool = { type: "web_search", filters: { allowed_domains: ALLOWED_DOMAINS } } as any;
    const tools = [webSearchTool, guidanceSearchTool] as any;
    const toolChoice =
      forceSearch
        ? ({ type: "web_search" as const } as any)
        : ("auto" as const);

    const systemContent = createSystemContent(includeTimestampNote);
    const devContent = createDeveloperContent(developerChatMode);
    const toolsUsed: ToolUsed[] = [];
    const recordTool = (tool: ToolUsed) => {
      if (!toolsUsed.includes(tool)) toolsUsed.push(tool);
    };

    let response = await client.responses.create({
      model,
      input: [
        { role: "system", content: systemContent },
        { role: "developer", content: devContent },
        { role: "user", content: [{ type: "input_text", text: userContent }] },
      ],
      tools,
      tool_choice: toolChoice as any,
      previous_response_id: previousResponseId || undefined,
    }, { timeout: RESPONSE_TIMEOUT_MS });
    accumulateUsage(response);

    for (let toolTurn = 0; toolTurn < MAX_GUIDANCE_TOOL_TURNS; toolTurn += 1) {
      const outputItems = Array.isArray((response as any).output) ? (response as any).output : [];
      const hasWebSearch = outputItems.some((item: any) => item?.type === 'web_search_call');
      if (hasWebSearch) {
        recordTool('web_search');
        setActiveToolStatus('web_search');
        await nextFrame();
      }

      const guidanceCalls = outputItems.filter(
        (item: any) => item?.type === 'function_call' && item?.name === guidanceSearchTool.name
      );

      if (guidanceCalls.length === 0) break;

      const guidanceDocuments = new Set<'phil' | 'cla'>();
      guidanceCalls.forEach((call: any) => {
        const document = guidanceDocumentFromArguments(call.arguments);
        if (document === 'phil' || document === 'both') {
          guidanceDocuments.add('phil');
          recordTool('phil_guidance');
        }
        if (document === 'cla' || document === 'both') {
          guidanceDocuments.add('cla');
          recordTool('cla_guidance');
        }
      });
      const guidanceStatus = guidanceStatusForDocuments(guidanceDocuments);
      if (guidanceStatus) {
        setActiveToolStatus(guidanceStatus);
        await nextFrame();
      }

      const functionOutputs = await Promise.all(guidanceCalls.map(async (call: any) => ({
        type: 'function_call_output' as const,
        call_id: call.call_id,
        output: await executeGuidanceToolCall(typeof call.arguments === 'string' ? call.arguments : '{}'),
      })));

      setActiveToolStatus('thinking');
      await nextFrame();

      response = await client.responses.create({
        model,
        input: [
          { role: "system", content: systemContent },
          { role: "developer", content: devContent },
          ...functionOutputs,
        ],
        tools,
        tool_choice: toolChoice as any,
        previous_response_id: response.id,
      }, { timeout: RESPONSE_TIMEOUT_MS });
      accumulateUsage(response);
    }

    setPreviousResponseId(response.id);
    setActiveToolStatus('thinking');
    await nextFrame();

    const { text, annotations } = extractResponseText(response);
    const sources = extractUniqueSources(
      filterUrlCitations(annotations)
    );
    const cleanedText = cleanMarkdown(text);

    await streamContentToMessage(assistantMessageIndex, cleanedText, sources, toolsUsed);

    const suggestions = await fetchSuggestions(suggestionsSeed, cleanedText, (inputTokens, outputTokens) => {
      usageInputTokens += inputTokens;
      usageOutputTokens += outputTokens;
    });
    setMessages((prev) =>
      prev.map((msg, idx) =>
        idx === assistantMessageIndex
          ? {
              ...msg,
              content: cleanedText,
              sources: sources ?? msg.sources,
              toolsUsed,
              elapsedMs: Date.now() - startedAt,
              ...(usageInputTokens + usageOutputTokens > 0
                ? {
                    costUsd: estimateCostUsd(
                      usageInputTokens,
                      usageOutputTokens,
                      model,
                      usageCachedTokens
                    ),
                  }
                : {}),
              ...(suggestions.length > 0 ? { suggestions } : {}),
            }
          : msg
      )
    );
    
  };

  const ask = async (providedQuery?: string) => {
    const query = (providedQuery ?? input).trim();
    if (!query || isLoading) return;

    setIsLoading(true);

    const userMessage: Message = { role: 'user', content: query };
    const assistantMessageIndex = addAssistantPlaceholder(userMessage);
    setInput('');

    try {
    const userContent = isEmailThread(query) ? createEmailThreadPrompt(query) : query;

      await runAssistantFlow({
        assistantMessageIndex,
        userContent,
        suggestionsSeed: query,
        includeTimestampNote: true,
        developerChatMode: true,
      });
    } catch (error) {
      handleAssistantError(assistantMessageIndex, error);
    } finally {
      setIsLoading(false);
      setStreamingMessageIndex(null);
      setActiveToolStatus(null);
    }
  };

  const processEmailThread = async (content: string, fileName?: string) => {
    let assistantMessageIndex = -1;

    try {
      setIsLoading(true);

      const userMessage: Message = {
        role: 'user',
        content,
        ...(fileName
          ? {
              attachment: {
                fileName,
                type: 'eml' as const,
              },
            }
          : {}),
      };

      assistantMessageIndex = addAssistantPlaceholder(userMessage);

      await runAssistantFlow({
        assistantMessageIndex,
        userContent: createEmailThreadPrompt(content),
        suggestionsSeed: content,
        includeTimestampNote: false,
        developerChatMode: false,
      });
    } catch (error) {
      handleAssistantError(assistantMessageIndex, error);
    } finally {
      setIsLoading(false);
      setStreamingMessageIndex(null);
      setActiveToolStatus(null);
    }
  };

  const processFileForInstantReply = async (file: File) => {
    try {
      const fileContent = await readFileAsText(file);
      const parsedContent = stripHtml(parseEmlFile(fileContent));

      await processEmailThread(parsedContent, file.name);
    } catch (error) {
      console.error('Error processing file:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Could not read that email file. Please choose a valid .eml file and try again.',
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
      setStreamingMessageIndex(null);
      setActiveToolStatus(null);
    }
  };

  const processFileForComment = async (file: File) => {
    try {
      const fileContent = await readFileAsText(file);
      const parsedContent = stripHtml(parseEmlFile(fileContent));

      setInput(`[Email attached: ${file.name}]\n\n${parsedContent}\n\n--- Add your comments below ---\n`);
    } catch (error) {
      console.error('Error processing file:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Could not read that email file. Please choose a valid .eml file and try again.',
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const newChat = () => {
    setPreviousResponseId(null);
    setStreamingMessageIndex(null);
    setActiveToolStatus(null);
    setMessages([]);
    setInput('');
  };

  const handleRegenerate = async () => {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMessage) {
      setInput(lastUserMessage.content);
      await ask(lastUserMessage.content);
    }
  };

  return {
    messages,
    input,
    isLoading,
    activeToolStatus,
    streamingMessageIndex,
    chatRef,
    setInput,
    ask,
    newChat,
    handleRegenerate,
    processFileForInstantReply,
    processFileForComment,
  };
}
