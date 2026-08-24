import React, { useRef, useState } from 'react';
import { isEmlFile, UNSUPPORTED_EMAIL_FILE_MESSAGE } from '../utils/emailFile';

interface InputFormProps {
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onAsk: () => void;
  onNewChat: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFileInstantReply?: (file: File) => void;
  onFileComment?: (file: File) => void;
}

export default function InputForm({ input, isLoading, onInputChange, onAsk, onNewChat, onKeyDown, onFileInstantReply, onFileComment }: InputFormProps) {
  const instantReplyInputRef = useRef<HTMLInputElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>, onFileSelected?: (file: File) => void) => {
    const file = event.target.files?.[0];
    if (file && isEmlFile(file)) {
      setFileError(null);
      onFileSelected?.(file);
    } else if (file) {
      setFileError(UNSUPPORTED_EMAIL_FILE_MESSAGE);
    }
    event.target.value = '';
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <textarea
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask a Cal Poly question, or paste an email thread…"
        aria-label="Ask Poly Advisor a question"
        className="w-full min-h-[100px] sm:min-h-[120px] px-3 sm:px-4 py-3 sm:py-4 input-cal-poly rounded-xl resize-vertical text-sm leading-relaxed"
        disabled={isLoading}
      />
      <div className="flex flex-col sm:flex-row-reverse gap-2 sm:gap-3">
        <button
          onClick={onAsk}
          disabled={isLoading || !input.trim()}
          className="w-full sm:w-auto px-5 sm:px-6 py-2.5 btn-cal-poly-primary rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          Ask Poly Advisor
        </button>
        <div className="flex gap-2 flex-1 sm:flex-initial">
          <button
            onClick={onNewChat}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-white/80 border border-gray-300 text-cal-poly-gray hover:text-cal-poly-primary hover:border-green-200 hover:bg-green-50 rounded-xl font-medium text-sm transition-colors"
          >
            New Chat
          </button>
          <button
            type="button"
            onClick={() => instantReplyInputRef.current?.click()}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-green-50/80 border border-green-200 text-green-800 hover:bg-green-100 rounded-xl font-medium text-sm transition-colors"
          >
            Draft reply from email
          </button>
          <button
            type="button"
            onClick={() => commentInputRef.current?.click()}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-50/80 border border-blue-200 text-blue-800 hover:bg-blue-100 rounded-xl font-medium text-sm transition-colors"
          >
            Add email to prompt
          </button>
        </div>
      </div>
      <input
        ref={instantReplyInputRef}
        type="file"
        accept=".eml,message/rfc822"
        className="sr-only"
        aria-label="Email file for an instant reply"
        onChange={(event) => handleFileSelection(event, onFileInstantReply)}
      />
      <input
        ref={commentInputRef}
        type="file"
        accept=".eml,message/rfc822"
        className="sr-only"
        aria-label="Email file to add to the prompt"
        onChange={(event) => handleFileSelection(event, onFileComment)}
      />
      {fileError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {fileError}
        </div>
      )}
    </div>
  );
}
