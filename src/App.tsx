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
          
          {/* API Key Section */}
          <div className="cal-poly-card p-6 rounded-xl cal-poly-shadow-lg mb-4">
            <div className="flex flex-wrap gap-3 items-center mb-3">
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
              
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="px-3 py-2 input-cal-poly rounded-lg text-sm font-medium"
              >
                <option value="gpt-4o">gpt-4o</option>
                <option value="gpt-4">gpt-4</option>
              </select>
            </div>
            
            <div className="mt-3 flex items-center text-xs text-cal-poly-gray">
              <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Your key stays secure in this browser. Never commit it to code.
            </div>
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
                    {message.content}
                  </div>
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