import { useState, useRef, useEffect } from 'react';
import OpenAI from 'openai';
import { Message } from '../types';
import { parseEmlFile, readFileAsText } from '../utils/emlParser';
import { stripHtml } from '../utils/stripHtml';
import { loadAdvisingDocument, formatAdvisingDocumentForPrompt } from '../utils/advisingDocument';
import { getChatErrorMessage } from '../utils/chatError';
import { ALLOWED_DOMAINS } from '../config/search';
import { createDeveloperPrompt, createEmailThreadPrompt, createSystemPrompt } from '../utils/chatPrompts';
import { cleanMarkdown } from '../utils/markdown';
import { extractResponseText, extractUniqueSources, filterUrlCitations } from '../utils/responseParser';

const isEmailThread = (text: string): boolean => {
  return /^(from|subject|date|to):/im.test(text) || /On .* wrote:/i.test(text);
};

const nextFrame = () =>
  new Promise<void>((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => resolve());
    } else {
      setTimeout(() => resolve(), 0);
    }
  });

export function useChat(
  model: string,
  searchDepth: 'medium' | 'high',
  forceSearch: boolean
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
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

  const createSystemContent = async (includeTimestampNote = false): Promise<Array<{ type: "input_text"; text: string }>> => {
    const advisingDoc = await loadAdvisingDocument();
    const formattedAdvisingDoc = formatAdvisingDocumentForPrompt(advisingDoc);
    return [{
      type: "input_text" as const,
      text: createSystemPrompt(searchDepth, formattedAdvisingDoc, includeTimestampNote),
    }];
  };

  const createDeveloperContent = (chatMode = false): Array<{ type: "input_text"; text: string }> => {
    return [{ type: "input_text" as const, text: createDeveloperPrompt(chatMode) }];
  };

  const fetchSuggestions = async (question: string, answer: string): Promise<string[]> => {
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
                text: "Generate two brief follow-up questions a student might ask next based on the conversation."
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text" as const,
                text: `Original question: ${question}\nAnswer: ${answer}\nProvide two follow-up questions.`
              }
            ]
          }
        ]
      });

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
    sources?: Message['sources']
  ) => {
    const totalLength = text.length;

    if (totalLength === 0) {
      setMessages((prev) =>
        prev.map((msg, idx) =>
          idx === assistantMessageIndex
            ? { ...msg, content: text, sources: sources && sources.length > 0 ? sources : undefined }
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

    const client = createClient();
    const tool = { type: "web_search", filters: { allowed_domains: ALLOWED_DOMAINS } } as any;
    const toolChoice =
      forceSearch
        ? ({ type: "web_search" as const } as any)
        : ("auto" as const);

    const systemContent = await createSystemContent(includeTimestampNote);
    const devContent = createDeveloperContent(developerChatMode);

    const response = await client.responses.create({
      model,
      input: [
        { role: "system", content: systemContent },
        { role: "developer", content: devContent },
        { role: "user", content: [{ type: "input_text", text: userContent }] },
      ],
      tools: [tool],
      tool_choice: toolChoice as any,
      previous_response_id: previousResponseId || undefined,
    });

    setPreviousResponseId(response.id);

    const { text, annotations } = extractResponseText(response);
    const sources = extractUniqueSources(
      filterUrlCitations(annotations)
    );
    const cleanedText = cleanMarkdown(text);

    await streamContentToMessage(assistantMessageIndex, cleanedText, sources);

    const suggestions = await fetchSuggestions(suggestionsSeed, cleanedText);
    setMessages((prev) =>
      prev.map((msg, idx) =>
        idx === assistantMessageIndex
          ? {
              ...msg,
              content: cleanedText,
              sources: sources ?? msg.sources,
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
