import React from 'react';

interface InputFormProps {
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onAsk: () => void;
  onNewChat: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export default function InputForm({ input, isLoading, onInputChange, onAsk, onNewChat, onKeyDown }: InputFormProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <textarea
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask a Cal Poly question, or paste an email thread…"
        className="w-full min-h-[100px] sm:min-h-[120px] px-3 sm:px-4 py-3 sm:py-4 input-cal-poly rounded-xl resize-vertical text-sm leading-relaxed"
        disabled={isLoading}
      />
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          onClick={onAsk}
          disabled={isLoading || !input.trim()}
          className="w-full sm:w-auto px-4 sm:px-6 py-3 btn-cal-poly-primary rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none order-1"
        >
          Ask Poly Advisor
        </button>
        <div className="flex gap-2 sm:gap-3 order-2">
          <button
            onClick={onNewChat}
            className="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 font-medium text-sm transition-all duration-300 hover:transform hover:-translate-y-0.5"
          >
            New Chat
          </button>
        </div>
      </div>
    </div>
  );
}
