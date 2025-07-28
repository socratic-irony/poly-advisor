import React, { useState, useRef, useEffect } from 'react';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';

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
  const [forceSearch, setForceSearch] = useState<boolean>(true);
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(true);
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

  const cleanMarkdown = (text: string): string => {
    // Remove excessive whitespace and normalize line breaks
    return text
      // Remove multiple consecutive blank lines (more than 2)
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      // Fix numbered lists - remove line breaks between number and content
      .replace(/(\d+\.)\s*\n\s*([^\n])/g, '$1 $2')
      // Fix bulleted lists - remove line breaks between bullet and content, even with blank lines
      .replace(/([*•\-+])\s*\n\s*([^\n])/g, '$1 $2')
      // Join lines within a paragraph that are separated by a single newline
      .replace(/([^\n])\n(?!\n|[*\-+]|\d+\.|\s*[#>`])/g, '$1 ')
      // Attempt to fix list items separated by more than one newline
      .replace(/\n\n([*•\-+])/g, '\n$1')
      // Fix sub-lists indentation issues
      .replace(/\n\s{2,}([*\-+\d])/g, '\n  $1')
      // Remove extra spaces before list items at start of lines
      .replace(/\n\s+([*\-+]|\d+\.)/g, '\n$1')
      // Clean up multiple spaces within lines
      .replace(/[ \t]{2,}/g, ' ')
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      // Remove trailing whitespace from each line
      .replace(/[ \t]+$/gm, '')
      // Ensure proper spacing after headers
      .replace(/^(#{1,6})\s*(.+)\s*$/gm, '$1 $2')
      // Ensure proper spacing around code blocks
      .replace(/```\s*\n/g, '```\n')
      .replace(/\n\s*```/g, '\n```')
      // Clean up blockquotes
      .replace(/>\s+/g, '> ')
      // Fix spacing around inline code
      .replace(/`\s+/g, '`')
      .replace(/\s+`/g, '`')
      // Ensure paragraphs have proper spacing
      .replace(/(\n[^\n#*\-+>\d`\s])/g, '\n$1')
      // Remove leading/trailing whitespace
      .trim();
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
      const tool = { type: "web_search" as const } as any;
      const toolChoice = forceSearch ? { type: "web_search" as const } as any : "auto" as const;

      const systemContent = [
        { type: "input_text" as const, text:
          "You are a Cal Poly advisor assistant. Restrict yourself to results from *.calpoly.edu. " +
          getSystemDepthText() + " " +
          "Prefer the most recent official policy, catalog, Registrar, and advising pages. " +
          "Give clear step-by-step instructions when forms/approvals are involved. " +
          "If the exact year is unclear, cite the most recent year you can find and label it; " +
          "if the specific year is not available, link the closest official source. " +
          "Always include inline citations and links with URLs. " +
          "However, DO NOT include a list e.g. of `**Sources**` at the end -- these are included in the JSON response. " +
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
        temperature: 0.5,
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

        // Deduplicate sources by URL
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

        const assistantMessage: Message = {
          role: 'assistant',
          content: cleanMarkdown(text),
          sources: uniqueSources.length > 0 ? uniqueSources : undefined
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
    <div className="min-h-screen cal-poly-gradient flex flex-col">
      <div className="max-w-5xl mx-auto w-full px-4 py-6 flex flex-col h-screen">
        {/* Header */}
        <div className="mb-6">
          <div className="text-center mb-6">
            <h1 className="text-5xl font-bold text-cal-poly-primary mb-2 tracking-tight">
              🎓 Poly Advisor
            </h1>
            <p className="text-lg text-cal-poly-gray">Your AI-powered Cal Poly assistant</p>
          </div>
          
          {/* Settings Section */}
          <div className="cal-poly-card p-4 sm:p-6 rounded-xl cal-poly-shadow-lg mb-4">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-cal-poly-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h2 className="text-xl font-semibold text-cal-poly-primary">Settings</h2>
              </div>
              <svg className={`w-6 h-6 text-cal-poly-gray transition-transform duration-300 ${isSettingsOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isSettingsOpen && (
              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap gap-3 items-center">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Paste your OpenAI API key"
                    className="flex-1 min-w-0 px-4 py-3 input-cal-poly rounded-lg focus:outline-none text-sm"
                    aria-label="OpenAI API key"
                  />
                  <button
                    onClick={saveKey}
                    className="px-6 py-3 btn-cal-poly-primary rounded-lg font-medium text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={forgetKey}
                    className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium text-sm transition-all duration-300 hover:transform hover:-translate-y-0.5"
                  >
                    Forget
                  </button>
                </div>
            
                {/* Settings Row */}
                <div className="flex flex-wrap gap-6 items-center text-sm">
                  <div className="flex gap-4">
                    <label className="flex items-center text-cal-poly-gray hover:text-cal-poly-primary cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="depth"
                        value="medium"
                        checked={searchDepth === 'medium'}
                        onChange={(e) => setSearchDepth(e.target.value as 'medium')}
                        className="mr-2 accent-green-600"
                      />
                      <span className="font-medium">Medium search</span>
                    </label>
                    <label className="flex items-center text-cal-poly-gray hover:text-cal-poly-primary cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="depth"
                        value="high"
                        checked={searchDepth === 'high'}
                        onChange={(e) => setSearchDepth(e.target.value as 'high')}
                        className="mr-2 accent-green-600"
                      />
                      <span className="font-medium">High search</span>
                    </label>
                  </div>
              
                  <label className="flex items-center text-cal-poly-gray hover:text-cal-poly-primary cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={forceSearch}
                      onChange={(e) => setForceSearch(e.target.checked)}
                      className="mr-2 accent-green-600"
                    />
                    <span className="font-medium">Force web search</span>
                  </label>
              
                  <div className="flex items-center gap-2">
                    <label className="font-medium text-cal-poly-gray">LLM model:</label>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="px-3 py-2 input-cal-poly rounded-lg text-sm font-medium"
                    >
                      <option value="gpt-4o">gpt-4.1</option>
                      <option value="gpt-4o">gpt-4.1-mini</option>
                      <option value="gpt-4o">gpt-4o</option>
                    </select>
                  </div>
                </div>
            
                <div className="mt-3 flex items-center text-xs text-cal-poly-gray">
                  <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Your key stays secure in this browser. Never commit it to code.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div
          ref={chatRef}
          className="flex-1 cal-poly-card rounded-xl cal-poly-shadow-lg p-6 mb-6 overflow-y-auto"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">🤔</div>
                <h2 className="text-2xl font-semibold text-cal-poly-primary mb-3">
                  Ready to help!
                </h2>
                <p className="text-cal-poly-gray text-lg leading-relaxed">
                  Ask any Cal Poly question or paste an email thread for a personalized advisor response.
                </p>
                <div className="mt-6 grid grid-cols-1 gap-3 text-sm">
                  <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200">
                    <strong>Try:</strong> "When is the add/drop deadline for Fall 2024?"
                  </div>
                  <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-lg border border-amber-200">
                    <strong>Or:</strong> "How do I change my major to Philosophy?"
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div key={index} className="group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      message.role === 'assistant' 
                        ? 'bg-green-100 text-green-700' 
                        : message.role === 'user' 
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {message.role === 'assistant' ? '🎓' : message.role === 'user' ? '👤' : '⚙️'}
                    </div>
                    <span className="font-semibold text-cal-poly-gray capitalize">
                      {message.role === 'assistant' ? 'Poly Advisor' : message.role === 'user' ? 'You' : 'System'}
                    </span>
                  </div>
                  <div className="ml-11 whitespace-pre-wrap text-cal-poly-gray-dark leading-relaxed">
                    <ReactMarkdown
                      components={{
                        a: ({ node, ...props }) => (
                          <a {...props} target="_blank" rel="noopener noreferrer" className="text-cal-poly-primary hover:text-cal-poly-green-light underline" />
                        ),
                        p: ({ node, ...props }) => <p {...props} className="mb-3 last:mb-0" />,
                        ul: ({ node, ...props }) => <ul {...props} className="list-disc ml-6 mb-3 space-y-1" />,
                        ol: ({ node, ...props }) => <ol {...props} className="list-decimal ml-6 mb-3 space-y-1" />,
                        li: ({ node, ...props }) => <li {...props} className="leading-relaxed" />,
                        h1: ({ node, ...props }) => <h1 {...props} className="text-2xl font-bold text-cal-poly-primary mb-4 mt-6 first:mt-0" />,
                        h2: ({ node, ...props }) => <h2 {...props} className="text-xl font-semibold text-cal-poly-primary mb-3 mt-5 first:mt-0" />,
                        h3: ({ node, ...props }) => <h3 {...props} className="text-lg font-semibold text-cal-poly-primary mb-2 mt-4 first:mt-0" />,
                        strong: ({ node, ...props }) => <strong {...props} className="font-semibold text-cal-poly-gray-dark" />,
                        em: ({ node, ...props }) => <em {...props} className="italic" />,
                        code: ({ node, ...props }) => <code {...props} className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm font-mono" />,
                        pre: ({ node, ...props }) => <pre {...props} className="bg-gray-100 text-gray-800 p-3 rounded-lg text-sm font-mono overflow-x-auto mb-3" />,
                        blockquote: ({ node, ...props }) => <blockquote {...props} className="border-l-4 border-cal-poly-primary pl-4 py-2 bg-gray-50 mb-3 italic" />
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>

                  {message.role === 'assistant' && (
                    <div className="ml-11 mt-3 flex items-center gap-2">
                      <button 
                        onClick={() => navigator.clipboard.writeText(message.content)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        Copy
                      </button>
                      <button 
                        onClick={() => {
                          const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
                          if (lastUserMessage) {
                            setInput(lastUserMessage.content);
                            ask();
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l5 5M20 20l-5-5" /></svg>
                        Regenerate
                      </button>
                    </div>
                  )}

                  {message.sources && message.sources.length > 0 && (
                    <div className="ml-11 mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <strong className="text-green-800 font-semibold">Sources from Cal Poly</strong>
                      </div>
                      <ol className="list-decimal list-inside space-y-2">
                        {message.sources.map((source, sourceIndex) => (
                          <li key={sourceIndex} className="text-sm">
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-700 hover:text-green-900 underline font-medium transition-colors ml-1"
                            >
                              {source.title}
                            </a>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {isLoading && (
            <div className="flex items-center gap-3 mt-6">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <span className="text-cal-poly-primary animate-pulse-cal-poly font-medium">
                Poly Advisor is thinking...
              </span>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="space-y-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a Cal Poly question, or paste an email thread…"
            className="w-full min-h-[120px] px-4 py-4 input-cal-poly rounded-xl resize-vertical text-sm leading-relaxed"
            disabled={isLoading}
          />
          <div className="flex flex-wrap gap-3">
            <button
              onClick={ask}
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 btn-cal-poly-primary rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              Ask Poly Advisor
            </button>
            <button
              onClick={newChat}
              className="px-6 py-3 btn-cal-poly-secondary rounded-xl font-medium text-sm"
            >
              New Chat
            </button>
            <button
              onClick={clearScreen}
              className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 font-medium text-sm transition-all duration-300 hover:transform hover:-translate-y-0.5"
            >
              Clear Screen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}