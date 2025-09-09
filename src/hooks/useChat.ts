import { useState, useRef, useEffect } from 'react';
import OpenAI from 'openai';
import { Message } from '../types';
import { parseEmlFile, readFileAsText } from '../utils/emlParser';
import { stripHtml } from '../utils/stripHtml';
import { loadAdvisingDocument, formatAdvisingDocumentForPrompt } from '../utils/advisingDocument';

// Helper functions
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
    const savedKey = localStorage.getItem('openai_key');
    if (!savedKey) {
      throw new Error("Please add your OpenAI API key first.");
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

  // Shared prompt configurations
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

  const ask = async () => {
    const query = input.trim();
    if (!query || isLoading) return;

    try {
      setIsLoading(true);
      const userMessage: Message = { role: 'user', content: query };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');

      // Add placeholder assistant message for streaming simulation
      const assistantMessageIndex = messages.length + 1;
      setStreamingMessageIndex(assistantMessageIndex);
      const placeholderMessage: Message = { role: 'assistant', content: '', sources: undefined };
      setMessages((prev) => [...prev, placeholderMessage]);

      const client = createClient();
      const tool = { type: "web_search" as const } as any;
      const toolChoice =
        forceSearch
          ? ({ type: "web_search" as const } as any)
          : ("auto" as const);

      const systemContent = await createSystemContent(true);

      let userContent = query;
      if (isEmailThread(query)) {
        userContent = getEmailThreadUserPrompt(query);
      }

      const devContent = createDeveloperContent(true);

      const response = await client.responses.create({
        model,
        input: [
          { role: "system", content: systemContent },
          { role: "developer", content: devContent },
          { role: "user", content: [{ type: "input_text", text: userContent }] },
        ],
        // temperature: 0.5,
        tools: [tool],
        tool_choice: toolChoice as any,
        previous_response_id: previousResponseId || undefined,
      });

      setPreviousResponseId(response.id);

      const messageItem = (response.output || []).find((o: any) => o.type === "message");
      if (messageItem) {
        const textObj = (messageItem as any).content?.find((c: any) => c.type === 'output_text');
        const text = textObj?.text || '';
        const annotations = textObj?.annotations?.filter((a: any) => a.type === 'url_citation') || [];

        const uniqueSources = annotations.reduce((acc: any[], annotation: any) => {
          const url = annotation.url;
          const existingSource = acc.find(source => source.url === url);
          if (!existingSource) {
            acc.push({
              title: annotation.title || annotation.url,
              url: annotation.url
            });
          }
          return acc;
        }, []);

        // Simulate streaming by updating the message progressively
        const cleanedText = cleanMarkdown(text);
        const words = cleanedText.split(' ');
        let currentContent = '';
        
        // Stream the text word by word for a better user experience
        for (let i = 0; i < words.length; i++) {
          currentContent += (i > 0 ? ' ' : '') + words[i];
          
          setMessages((prev) => 
            prev.map((msg, idx) => 
              idx === assistantMessageIndex
                ? { 
                    ...msg, 
                    content: currentContent,
                    sources: i === words.length - 1 && uniqueSources.length > 0 ? uniqueSources : undefined
                  }
                : msg
            )
          );
          
          // Add a small delay to simulate streaming
          if (i < words.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 30));
          }
        }

        const suggestions = await fetchSuggestions(query, cleanedText);
        if (suggestions.length > 0) {
          setMessages(prev =>
            prev.map((msg, idx) =>
              idx === assistantMessageIndex ? { ...msg, suggestions } : msg
            )
          );
        }
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`
      };
      
      if (streamingMessageIndex !== null) {
        setMessages((prev) => 
          prev.map((msg, idx) => 
            idx === streamingMessageIndex
              ? errorMessage
              : msg
          )
        );
      } else {
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      setStreamingMessageIndex(null);
    }
  };

  const newChat = () => {
    setPreviousResponseId(null);
    setStreamingMessageIndex(null);
    const systemMessage: Message = { role: 'system', content: 'Started a new chat.' };
    setMessages([systemMessage]);
  };

  const clearScreen = () => {
    setStreamingMessageIndex(null);
    setMessages([]);
  };

  const handleRegenerate = () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      setInput(lastUserMessage.content);
      ask();
    }
  };

  const processFileForInstantReply = async (file: File) => {
    try {
      setIsLoading(true);
      const fileContent = await readFileAsText(file);
      const parsedContent = stripHtml(parseEmlFile(fileContent));
      
      const userMessage: Message = { 
        role: 'user', 
        content: parsedContent,
        attachment: {
          fileName: file.name,
          type: 'eml'
        }
      };
      setMessages((prev) => [...prev, userMessage]);
      
      // Process as email thread for instant reply
      await processEmailThread(parsedContent, file.name);
    } catch (error) {
      console.error('Error processing file:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const processFileForComment = async (file: File) => {
    try {
      const fileContent = await readFileAsText(file);
      const parsedContent = stripHtml(parseEmlFile(fileContent));
      
      // Set the input with the parsed content so user can add comments
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

  const processEmailThread = async (content: string, fileName?: string) => {
    try {
      // Add placeholder assistant message for streaming simulation
      const assistantMessageIndex = messages.length + (fileName ? 1 : 0);
      setStreamingMessageIndex(assistantMessageIndex);
      const placeholderMessage: Message = { role: 'assistant', content: '', sources: undefined };
      setMessages((prev) => [...prev, placeholderMessage]);

      const client = createClient();
      const tool = { type: "web_search" as const } as any;
      const toolChoice =
        forceSearch
          ? ({ type: "web_search" as const } as any)
          : ("auto" as const);

      const systemContent = await createSystemContent(false);

      const userContent = getEmailThreadUserPrompt(content);

      const devContent = createDeveloperContent(false);

      const response = await client.responses.create({
        model,
        input: [
          { role: "system", content: systemContent },
          { role: "developer", content: devContent },
          { role: "user", content: [{ type: "input_text", text: userContent }] },
        ],
        // temperature: 0.5,
        tools: [tool],
        tool_choice: toolChoice as any,
        previous_response_id: previousResponseId || undefined,
      });

      setPreviousResponseId(response.id);

      const messageItem = (response.output || []).find((o: any) => o.type === "message");
      if (messageItem) {
        const textObj = (messageItem as any).content?.find((c: any) => c.type === 'output_text');
        const text = textObj?.text || '';
        const annotations = textObj?.annotations?.filter((a: any) => a.type === 'url_citation') || [];

        const uniqueSources = annotations.reduce((acc: any[], annotation: any) => {
          const url = annotation.url;
          const existingSource = acc.find(source => source.url === url);
          if (!existingSource) {
            acc.push({
              title: annotation.title || annotation.url,
              url: annotation.url
            });
          }
          return acc;
        }, []);

        // Simulate streaming by updating the message progressively
        const cleanedText = cleanMarkdown(text);
        const words = cleanedText.split(' ');
        let currentContent = '';
        
        // Stream the text word by word for a better user experience
        for (let i = 0; i < words.length; i++) {
          currentContent += (i > 0 ? ' ' : '') + words[i];
          
          setMessages((prev) => 
            prev.map((msg, idx) => 
              idx === assistantMessageIndex
                ? { 
                    ...msg, 
                    content: currentContent,
                    sources: i === words.length - 1 && uniqueSources.length > 0 ? uniqueSources : undefined
                  }
                : msg
            )
          );
          
          // Add a small delay to simulate streaming
          if (i < words.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 30));
          }
        }

        const suggestions = await fetchSuggestions(content, cleanedText);
        if (suggestions.length > 0) {
          setMessages(prev =>
            prev.map((msg, idx) =>
              idx === assistantMessageIndex ? { ...msg, suggestions } : msg
            )
          );
        }
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`
      };
      
      if (streamingMessageIndex !== null) {
        setMessages((prev) => 
          prev.map((msg, idx) => 
            idx === streamingMessageIndex
              ? errorMessage
              : msg
          )
        );
      } else {
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      setStreamingMessageIndex(null);
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
    clearScreen,
    handleRegenerate,
    processFileForInstantReply,
    processFileForComment,
  };
}
