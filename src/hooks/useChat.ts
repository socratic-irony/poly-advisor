import { useState, useRef, useEffect } from 'react';
import OpenAI from 'openai';
import { Message } from '../types';
import { parseEmlFile, readFileAsText } from '../utils/emlParser';
import { stripHtml } from '../utils/stripHtml';
import { loadAdvisingDocument, formatAdvisingDocumentForPrompt } from '../utils/advisingDocument';
// @ts-ignore: openai-responses.js is a plain JS helper outside the TS root
import { ALLOWED_DOMAINS } from '../../openai-responses.js';

const isEmailThread = (text: string): boolean => {
  return /^(from|subject|date|to):/im.test(text) || /On .* wrote:/i.test(text);
};

const cleanMarkdown = (text: string): string => {
  return text
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .replace(/(\d+\.)\s*\n\s*([^\n])/g, '$1 $2')
    .replace(/([*•\-+])\s*\n\s*([^\n])/g, '$1 $2')
    .replace(/([^\n])\n(?!\n|[*\-+]|\d+\.|\s*[#>`])/g, '$1 ')
    .replace(/\n\n([*•\-+])/g, '\n$1')
    .replace(/\n\s{2,}([*\-+\d])/g, '\n  $1')
    .replace(/\n\s+([*\-+]|\d+\.)/g, '\n$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/^(#{1,6})\s*(.+)\s*$/gm, '$1 $2')
    .replace(/```\s*\n/g, '```\n')
    .replace(/\n\s*```/g, '\n```')
    .replace(/>\s+/g, '> ')
    .replace(/`\s+/g, '`')
    .replace(/\s+`/g, '`')
    .replace(/(\n[^\n#*\-+>\d`\s])/g, '\n$1')
    .trim();
};

const nextFrame = () =>
  new Promise<void>((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => resolve());
    } else {
      setTimeout(() => resolve(), 0);
    }
  });

const extractUniqueSources = (annotations: any[]): Message['sources'] => {
  if (!Array.isArray(annotations)) {
    return undefined;
  }

  const unique = annotations.reduce((acc: NonNullable<Message['sources']>, annotation: any) => {
    const url = annotation?.url;
    if (!url) {
      return acc;
    }

    if (!acc.some((source) => source.url === url)) {
      acc.push({
        title: annotation.title || url,
        url,
      });
    }

    return acc;
  }, [] as NonNullable<Message['sources']>);

  return unique.length > 0 ? unique : undefined;
};

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

  const getSystemDepthText = (): string => {
    return searchDepth === 'high'
      ? "Use a high-depth web search within *.calpoly.edu (cast a wider net, review more authoritative pages)."
      : "Use a medium-depth web search within *.calpoly.edu.";
  };

  const getBaseSystemPrompt = async (): Promise<string> => {
    const advisingDoc = await loadAdvisingDocument();
    const formattedAdvisingDoc = formatAdvisingDocumentForPrompt(advisingDoc);

    return "You are playing the role of a student advisor for a university. " +
      "The university is Cal Poly, San Luis Obispo. ASSUME ALL QUESTIONS PERTAIN TO CAL POLY, SAN LUIS OBISPO unless otherwise noted. " +
      "First, check the attached advising document which contains authoritative information about the Philosophy department. " +
      "Search only within calpoly.edu and provide information only that comes from calpoly.edu unless explicitly asked otherwise. " +
      getSystemDepthText() + " " +
      "Prefer the most recent official policy, catalog, Registrar, and advising pages. " +
      "Give clear step-by-step instructions when forms/approvals are involved. " +
      "If the exact year is unclear, cite the most recent year you can find and label it; " +
      "if the specific year is not available, link the closest official source. " +
      "Always include inline citations and links with URLs. " +
      "However, DO NOT include a list e.g. of `**Sources**` at the end -- these are included in the JSON response. " +
      "Use absolute dates (e.g., July 28, 2025). Ask a brief clarifying question if necessary." +
      formattedAdvisingDoc;
  };

  const getBaseDeveloperPrompt = (): string => {
    return "Identity: Advisor initials RJ (PHIL). Assume student major PHIL unless otherwise stated. Do not sign responses or add any signature. " +
      "Always produce inline citations and a Sources list with titles and URLs. Links must open in a new tab.";
  };

  const getEmailThreadUserPrompt = (content: string): string => {
    return "The following is an email thread. Infer roles (advisor = RJ, Philosophy; student = the other party). " +
      "Draft a concise reply with cited Cal Poly URLs. Do not include any signature or sign-off.\n\n" +
      "Email thread:\n\n" + content;
  };

  const createSystemContent = async (includeTimestampNote = false): Promise<Array<{ type: "input_text"; text: string }>> => {
    let systemText = await getBaseSystemPrompt();
    if (includeTimestampNote) {
      systemText = systemText.replace(
        "State the date when policies were last updated, if available. ",
        ""
      );
    } else {
      systemText = systemText.replace(
        "Prefer the most recent official policy, catalog, Registrar, and advising pages. ",
        "Prefer the most recent official policy, catalog, Registrar, and advising pages. State the date when policies were last updated, if available. "
      );
    }
    return [{ type: "input_text" as const, text: systemText }];
  };

  const createDeveloperContent = (chatMode = false): Array<{ type: "input_text"; text: string }> => {
    let devText = getBaseDeveloperPrompt();
    if (chatMode) {
      devText = devText.replace(
        "Identity: Advisor initials RJ (PHIL). Assume student major PHIL unless otherwise stated. Do not sign responses or add any signature. " +
        "Always produce inline citations and a Sources list with titles and URLs. Links must open in a new tab.",
        "Identity: You are fielding a question sent to the email address ryjenkin. " +
        "Assume the student's major is PHIL unless otherwise stated. Do not sign responses or add any signature. " +
        "Always produce inline citations. Do not include a list of Sources or References. " +
        "Links must open in a new tab."
      );
    }
    return [{ type: "input_text" as const, text: devText }];
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

      const messageItem = (response.output || []).find((o: any) => o.type === "message");
      const textObj = (messageItem as any)?.content?.find((c: any) => c.type === 'output_text');
      const text = textObj?.text || '';
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
    let assistantIndex = -1;
    setMessages((prev) => {
      const base = userMessage ? [...prev, userMessage] : [...prev];
      assistantIndex = base.length;
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
      content: `Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`
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

    const messageItem = (response.output || []).find((o: any) => o.type === "message");
    const textObj = (messageItem as any)?.content?.find((c: any) => c.type === 'output_text');
    const text = textObj?.text || '';
    const annotations = textObj?.annotations?.filter((a: any) => a.type === 'url_citation') || [];

    const sources = extractUniqueSources(annotations);
    const cleanedText = cleanMarkdown(text);

    await streamContentToMessage(assistantMessageIndex, cleanedText, sources);

    const suggestions = await fetchSuggestions(suggestionsSeed, cleanedText);
    if (suggestions.length > 0) {
      setMessages((prev) =>
        prev.map((msg, idx) =>
          idx === assistantMessageIndex ? { ...msg, suggestions } : msg
        )
      );
    }
  };

  const ask = async (providedQuery?: string) => {
    const query = (providedQuery ?? input).trim();
    if (!query || isLoading) return;

    setIsLoading(true);

    const userMessage: Message = { role: 'user', content: query };
    const assistantMessageIndex = addAssistantPlaceholder(userMessage);
    setInput('');

    try {
      const userContent = isEmailThread(query) ? getEmailThreadUserPrompt(query) : query;

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
        userContent: getEmailThreadUserPrompt(content),
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
        content: `Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`
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
        content: `Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`
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
