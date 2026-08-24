import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { useSettings } from './hooks/useSettings';
import { useChat } from './hooks/useChat';
import SettingsModal from './components/SettingsModal';
import TopMenuBar from './components/TopMenuBar';
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
    storageError,
  } = useSettings();

  const {
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
  } = useChat(model, searchDepth, forceSearch);

  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  };

  const handleAsk = () => {
    ask(input);
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

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    // Pass the suggestion directly to ask to avoid race conditions with state
    ask(suggestion);
  };

  const handleCopy = (index: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageIndex(index);
    setTimeout(() => setCopiedMessageIndex(null), 2000);
  };

  return (
    <div className="min-h-dvh cal-poly-gradient flex flex-col">
      {/* Mobile menu bar */}
      <TopMenuBar onSettingsClick={() => setIsSettingsModalOpen(true)} />

      <div className="max-w-5xl mx-auto w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-6 flex flex-col flex-1 overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-5 sm:mb-7">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-cal-poly-primary mb-1 tracking-tight">
            🎓 Poly Advisor
          </h1>
          <p className="text-sm sm:text-base text-cal-poly-gray">
            Your AI-powered Cal Poly assistant
          </p>
        </div>

        {/* Desktop settings button - positioned in upper right of chat area */}
        <div className="relative flex-1 flex flex-col">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="hidden md:flex absolute top-4 right-4 z-10 items-center gap-2 px-3 py-2 text-cal-poly-gray hover:text-cal-poly-primary hover:bg-white/50 rounded-lg transition-colors"
            aria-label="Open settings"
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm font-medium">Settings</span>
          </button>

          <ChatView
            messages={messages}
            isLoading={isLoading}
            activeToolStatus={activeToolStatus}
            streamingMessageIndex={streamingMessageIndex}
            chatRef={chatRef}
            copiedMessageIndex={copiedMessageIndex}
            onCopy={handleCopy}
            onRegenerate={handleRegenerate}
            onExport={exportToMarkdown}
            onFileInstantReply={processFileForInstantReply}
            onFileComment={processFileForComment}
            onSuggestionClick={handleSuggestionClick}
          />
        </div>

        <InputForm
          input={input}
          isLoading={isLoading}
          onInputChange={setInput}
          onAsk={handleAsk}
          onNewChat={newChat}
          onKeyDown={handleKeyDown}
          onFileInstantReply={processFileForInstantReply}
          onFileComment={processFileForComment}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
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
        storageError={storageError}
      />
    </div>
  );
}
