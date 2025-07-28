import React, { useState, useRef, useEffect } from 'react';
import OpenAI from 'openai';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: Array<{
    title: string;
    url: string;
  }>;
}

export default function App() {
  const [apiKey, setApiKey] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [model, setModel] = useState<string>('gpt-4o');
  const [searchDepth, setSearchDepth] = useState<'medium' | 'high'>('medium');
  const [forceSearch, setForceSearch] = useState<boolean>(false);
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('openai_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  // Auto scroll to bottom when new messages added
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const saveKey = () => {
    const trimmedKey = apiKey.trim();
    localStorage.setItem('openai_key', trimmedKey);
    setApiKey(trimmedKey);
  };

  const forgetKey = () => {
    localStorage.removeItem('openai_key');
    setApiKey('');
  };

  const isEmailThread = (text: string): boolean => {
    return /^(from|subject|date|to):/im.test(text) || /On .* wrote:/i.test(text);
  };

  const getSystemDepthText = (): string => {
    return searchDepth === 'high'
      ? "Use a high-depth web search within *.calpoly.edu (cast a wider net, review more authoritative pages)."
      : "Use a medium-depth web search within *.calpoly.edu.";
  };

  const createClient = (): OpenAI => {
    const savedKey = localStorage.getItem('openai_key');
    if (!savedKey) {
      throw new Error("Please add your OpenAI API key first.");
    }
    return new OpenAI({ 
      apiKey: savedKey, 
      dangerouslyAllowBrowser: true 
    });
  };

  const ask = async () => {
    const query = input.trim();
    if (!query || isLoading) return;

    try {
      setIsLoading(true);
      
      // Add user message
      const userMessage: Message = { role: 'user', content: query };
      setMessages(prev => [...prev, userMessage]);
      setInput('');

      const client = createClient();
      const tool = { type: "web_search" as const };
      const toolChoice = forceSearch ? { type: "web_search" as const } : "auto" as const;

      const systemContent = [
        { type: "input_text" as const, text:
          "You are a Cal Poly advisor assistant. Restrict yourself to results from *.calpoly.edu. " +
          getSystemDepthText() + " " +
          "Prefer the most recent official policy, catalog, Registrar, and advising pages. " +
          "Give clear step-by-step instructions when forms/approvals are involved. " +
          "If the exact year is unclear, cite the most recent year you can find and label it; " +
          "if the specific year is not available, link the closest official source. " +
          "Always include inline citations and a Sources list with titles and URLs. " +
          "Use absolute dates (e.g., July 28, 2025). Ask a brief clarifying question if necessary."
        }
      ];

      let userContent = query;

      if (isEmailThread(query)) {
        userContent =
          "The following is an email thread. Infer roles (advisor = RJ, Philosophy; student = the other party). " +
          "Draft a concise reply with cited Cal Poly URLs and append this signature block:\n\n" +
          "Let me know if you have any questions or concerns. Thank you!\n\nBest,\nRyan\n\n" +
          "Email thread:\n\n" + query;
      }

      const devContent = [
        { type: "input_text" as const, text:
          "Identity: Advisor initials RJ (PHIL). Assume student major PHIL unless otherwise stated. " +
          "Always produce inline citations and a Sources list with titles and URLs. Links must open in a new tab."
        }
      ];

      const response = await client.responses.create({
        model,
        input: [
          { role: "system", content: systemContent },
          { role: "developer", content: devContent },
          { role: "user", content: [{ type: "input_text", text: userContent }] },
        ],
        tools: [tool],
        tool_choice: toolChoice,
        previous_response_id: previousResponseId || undefined,
      });

      setPreviousResponseId(response.id);

      const messageItem = (response.output || []).find((o: any) => o.type === "message");
      if (messageItem) {
        const textObj = messageItem.content.find((c: any) => c.type === 'output_text');
        const text = textObj?.text || '';
        const annotations = textObj?.annotations?.filter((a: any) => a.type === 'url_citation') || [];

        const sources = annotations.map((a: any) => ({
          title: a.title || a.url,
          url: a.url
        }));

        const assistantMessage: Message = {
          role: 'assistant',
          content: text,
          sources: sources.length > 0 ? sources : undefined
        };

        setMessages(prev => [...prev, assistantMessage]);
      }

    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const newChat = () => {
    setPreviousResponseId(null);
    const systemMessage: Message = { role: 'system', content: 'Started a new chat.' };
    setMessages([systemMessage]);
  };

  const clearScreen = () => {
    setMessages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="max-w-4xl mx-auto w-full px-4 py-6 flex flex-col h-screen">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Poly Advisor</h1>
          
          {/* API Key Section */}
          <div className="bg-white p-4 rounded-lg shadow-sm border mb-4">
            <div className="flex flex-wrap gap-2 items-center mb-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your OpenAI API key"
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="OpenAI API key"
              />
              <button
                onClick={saveKey}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Save
              </button>
              <button
                onClick={forgetKey}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Forget
              </button>
            </div>
            
            {/* Settings Row */}
            <div className="flex flex-wrap gap-4 items-center text-sm">
              <div className="flex gap-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="depth"
                    value="medium"
                    checked={searchDepth === 'medium'}
                    onChange={(e) => setSearchDepth(e.target.value as 'medium')}
                    className="mr-1"
                  />
                  Medium search
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="depth"
                    value="high"
                    checked={searchDepth === 'high'}
                    onChange={(e) => setSearchDepth(e.target.value as 'high')}
                    className="mr-1"
                  />
                  High search
                </label>
              </div>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={forceSearch}
                  onChange={(e) => setForceSearch(e.target.checked)}
                  className="mr-1"
                />
                Force web search
              </label>
              
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="gpt-4o">gpt-4o</option>
                <option value="gpt-4">gpt-4</option>
              </select>
            </div>
            
            <p className="text-xs text-gray-600 mt-2">
              Your key stays in this browser. Never commit it to code.
            </p>
          </div>
        </div>

        {/* Chat Area */}
        <div
          ref={chatRef}
          className="flex-1 bg-white rounded-lg shadow-sm border p-4 mb-4 overflow-y-auto"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              Ask a Cal Poly question, or paste an email thread…
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className="mb-4">
                <div className="font-semibold text-sm mb-1 capitalize">
                  {message.role === 'assistant' ? 'Assistant' : message.role === 'user' ? 'You' : 'System'}
                </div>
                <div className="whitespace-pre-wrap text-gray-800">
                  {message.content}
                </div>
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 text-sm">
                    <strong>Sources</strong>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      {message.sources.map((source, sourceIndex) => (
                        <li key={sourceIndex}>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            {source.title}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="text-gray-500 animate-pulse">
              Assistant is thinking...
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="space-y-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a Cal Poly question, or paste an email thread…"
            className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
            disabled={isLoading}
          />
          <div className="flex gap-2">
            <button
              onClick={ask}
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ask
            </button>
            <button
              onClick={newChat}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              New chat
            </button>
            <button
              onClick={clearScreen}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Clear screen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}