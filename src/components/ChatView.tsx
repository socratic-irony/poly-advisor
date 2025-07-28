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
      className="flex-1 cal-poly-card rounded-xl cal-poly-shadow-lg p-3 sm:p-4 lg:p-6 mb-3 sm:mb-6 overflow-y-auto"
      aria-live="polite"
    >
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🤔</div>
            <h2 className="text-xl sm:text-2xl font-semibold text-cal-poly-primary mb-2 sm:mb-3">
              Ready to help!
            </h2>
            <p className="text-cal-poly-gray text-base sm:text-lg leading-relaxed mb-4 sm:mb-6">
              Ask any Cal Poly question or paste an email thread for a personalized advisor response.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:gap-3 text-xs sm:text-sm">
              <div className="bg-green-50 text-green-700 px-3 sm:px-4 py-2 rounded-lg border border-green-200">
                <strong>Try:</strong> "When is the add/drop deadline for Fall 2024?"
              </div>
              <div className="bg-amber-50 text-amber-700 px-3 sm:px-4 py-2 rounded-lg border border-amber-200">
                <strong>Or:</strong> "How do I change my major to Philosophy?"
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
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
        <div className="flex items-center gap-2 sm:gap-3 mt-4 sm:mt-6">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-green-100 flex items-center justify-center">
            <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <span className="text-cal-poly-primary animate-pulse-cal-poly font-medium text-sm sm:text-base">
            Poly Advisor is searching & thinking...
          </span>
        </div>
      )}
    </div>
  );
}
