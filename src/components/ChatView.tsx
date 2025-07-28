import { Message as MessageType } from '../types';
import Message from './Message';

interface ChatViewProps {
  messages: MessageType[];
  isLoading: boolean;
  chatRef: React.RefObject<HTMLDivElement>;
  copiedMessageIndex: number | null;
  onCopy: (index: number, content: string) => void;
  onRegenerate: () => void;
  onExport: (content: string) => void;
}

export default function ChatView({ messages, isLoading, chatRef, copiedMessageIndex, onCopy, onRegenerate, onExport }: ChatViewProps) {
  return (
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
            <Message 
              key={index}
              message={message}
              index={index}
              copiedMessageIndex={copiedMessageIndex}
              onCopy={onCopy}
              onRegenerate={onRegenerate}
              onExport={onExport}
            />
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
  );
}
