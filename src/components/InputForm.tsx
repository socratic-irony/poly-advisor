import React from 'react';

interface InputFormProps {
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onAsk: () => void;
  onNewChat: () => void;
  onClearScreen: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export default function InputForm({ input, isLoading, onInputChange, onAsk, onNewChat, onClearScreen, onKeyDown }: InputFormProps) {
  return (
    <div className="space-y-4">
      <textarea
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask a Cal Poly question, or paste an email thread…"
        className="w-full min-h-[120px] px-4 py-4 input-cal-poly rounded-xl resize-vertical text-sm leading-relaxed"
        disabled={isLoading}
      />
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onAsk}
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 btn-cal-poly-primary rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          Ask Poly Advisor
        </button>
        <button
          onClick={onNewChat}
          className="px-6 py-3 btn-cal-poly-secondary rounded-xl font-medium text-sm"
        >
          New Chat
        </button>
        <button
          onClick={onClearScreen}
          className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 font-medium text-sm transition-all duration-300 hover:transform hover:-translate-y-0.5"
        >
          Clear Screen
        </button>
      </div>
    </div>
  );
}
