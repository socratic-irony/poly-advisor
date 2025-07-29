import React, { useState } from 'react';
import { useSettings } from './hooks/useSettings';
import { useChat } from './hooks/useChat';
import SettingsComponent from './components/Settings';
import ChatView from './components/ChatView';
import InputForm from './components/InputForm';

export default function App() {
  const {
    apiKey,
    setApiKey,
    model,
    setModel,
    searchDepth,
    setSearchDepth,
    forceSearch,
    setForceSearch,
    saveKey,
    forgetKey,
  } = useSettings();

  const {
    messages,
    input,
    isLoading,
    chatRef,
    setInput,
    ask,
    clearScreen,
    handleRegenerate,
  } = useChat(model, searchDepth, forceSearch);

  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  };

  const exportToMarkdown = (content: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'poly-advisor-chat.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = (index: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageIndex(index);
    setTimeout(() => setCopiedMessageIndex(null), 2000);
  };

  return (
    <div className="min-h-screen cal-poly-gradient flex flex-col">
      <div className="max-w-5xl mx-auto w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-6 flex flex-col h-screen">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-cal-poly-primary mb-2 tracking-tight">
              🎓 Poly Advisor
            </h1>
            <p className="text-base sm:text-lg text-cal-poly-gray">Your AI-powered Cal Poly assistant</p>
          </div>
          
          <SettingsComponent
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
            onSaveKey={saveKey}
            onForgetKey={forgetKey}
            searchDepth={searchDepth}
            onSearchDepthChange={setSearchDepth}
            forceSearch={forceSearch}
            onForceSearchChange={setForceSearch}
            model={model}
            onModelChange={setModel}
          />
        </div>

        <ChatView
          messages={messages}
          isLoading={isLoading}
          chatRef={chatRef}
          copiedMessageIndex={copiedMessageIndex}
          onCopy={handleCopy}
          onRegenerate={handleRegenerate}
          onExport={exportToMarkdown}
        />

        <InputForm
          input={input}
          isLoading={isLoading}
          onInputChange={setInput}
          onAsk={ask}
          onClearScreen={clearScreen}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
}