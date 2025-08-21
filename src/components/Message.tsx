import { lazy, Suspense, useState } from 'react';
const ReactMarkdown = lazy(() => import('react-markdown'));
const CopyIcon = lazy(() => import('lucide-react').then(m => ({ default: m.Copy })));
const CheckIcon = lazy(() => import('lucide-react').then(m => ({ default: m.Check })));
const RotateCwIcon = lazy(() => import('lucide-react').then(m => ({ default: m.RotateCw })));
const DownloadIcon = lazy(() => import('lucide-react').then(m => ({ default: m.Download })));
const MailIcon = lazy(() => import('lucide-react').then(m => ({ default: m.Mail })));
import { Message as MessageType } from '../types';

interface MessageProps {
  message: MessageType;
  index: number;
  isStreaming: boolean;
  copiedMessageIndex: number | null;
  onCopy: (index: number, content: string) => void;
  onRegenerate: () => void;
  onExport: (content: string) => void;
}

export default function Message({ message, index, isStreaming, copiedMessageIndex, onCopy, onRegenerate, onExport }: MessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const words = message.content.trim().split(/\s+/);
  const shouldTruncate = Boolean(message.attachment) && words.length > 200;
  const displayContent = shouldTruncate && !isExpanded
    ? words.slice(0, 200).join(' ') + '...'
    : message.content;

  return (
    <div className="group">
      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold ${
          message.role === 'assistant' 
            ? 'bg-green-100 text-green-700' 
            : message.role === 'user' 
            ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-700'
        }`}>
          {message.role === 'assistant' ? '🎓' : message.role === 'user' ? '👤' : '⚙️'}
        </div>
        <span className="font-semibold text-cal-poly-gray capitalize text-sm sm:text-base">
          {message.role === 'assistant' ? 'Poly Advisor' : message.role === 'user' ? 'You' : 'System'}
        </span>
      </div>
      <div className="ml-8 sm:ml-11 whitespace-pre-wrap text-cal-poly-gray-dark leading-relaxed text-sm sm:text-base">
        {message.attachment ? (
          <div className="mb-3 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Suspense fallback={null}>
                <MailIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
              </Suspense>
              <span className="text-gray-800 font-medium text-xs sm:text-sm">Email Attachment</span>
              {message.attachment.fileName && (
                <span className="ml-auto text-gray-600 text-xs truncate">{message.attachment.fileName}</span>
              )}
            </div>
              <Suspense fallback={null}>
              <ReactMarkdown
          components={{
            a: ({ node, ...props }) => (
              <a {...props} target="_blank" rel="noopener noreferrer" className="text-cal-poly-primary hover:text-cal-poly-green-light underline break-words" />
            ),
            p: ({ node, ...props }) => <p {...props} className="mb-2 sm:mb-3 last:mb-0" />,
            ul: ({ node, ...props }) => <ul {...props} className="list-disc ml-4 sm:ml-6 mb-2 sm:mb-3 space-y-1" />,
            ol: ({ node, ...props }) => <ol {...props} className="list-decimal ml-4 sm:ml-6 mb-2 sm:mb-3 space-y-1" />,
            li: ({ node, ...props }) => <li {...props} className="leading-relaxed" />,
            h1: ({ node, ...props }) => <h1 {...props} className="text-xl sm:text-2xl font-bold text-cal-poly-primary mb-3 sm:mb-4 mt-4 sm:mt-6 first:mt-0" />,
            h2: ({ node, ...props }) => <h2 {...props} className="text-lg sm:text-xl font-semibold text-cal-poly-primary mb-2 sm:mb-3 mt-3 sm:mt-5 first:mt-0" />,
            h3: ({ node, ...props }) => <h3 {...props} className="text-base sm:text-lg font-semibold text-cal-poly-primary mb-2 mt-3 sm:mt-4 first:mt-0" />,
            strong: ({ node, ...props }) => <strong {...props} className="font-semibold text-cal-poly-gray-dark" />,
            em: ({ node, ...props }) => <em {...props} className="italic" />,
            code: ({ node, ...props }) => <code {...props} className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs sm:text-sm font-mono break-words" />,
            pre: ({ node, ...props }) => <pre {...props} className="bg-gray-100 text-gray-800 p-2 sm:p-3 rounded-lg text-xs sm:text-sm font-mono overflow-x-auto mb-2 sm:mb-3" />,
            blockquote: ({ node, ...props }) => <blockquote {...props} className="border-l-4 border-cal-poly-primary pl-3 sm:pl-4 py-2 bg-gray-50 mb-2 sm:mb-3 italic" />
          }}
            >
              {displayContent}
              </ReactMarkdown>
              </Suspense>
            {shouldTruncate && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                {isExpanded ? 'Show Less' : 'Show More'}
              </button>
            )}
          </div>
        ) : (
            <Suspense fallback={null}>
            <ReactMarkdown
            components={{
              a: ({ node, ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" className="text-cal-poly-primary hover:text-cal-poly-green-light underline break-words" />
              ),
              p: ({ node, ...props }) => <p {...props} className="mb-2 sm:mb-3 last:mb-0" />,
              ul: ({ node, ...props }) => <ul {...props} className="list-disc ml-4 sm:ml-6 mb-2 sm:mb-3 space-y-1" />,
              ol: ({ node, ...props }) => <ol {...props} className="list-decimal ml-4 sm:ml-6 mb-2 sm:mb-3 space-y-1" />,
              li: ({ node, ...props }) => <li {...props} className="leading-relaxed" />,
              h1: ({ node, ...props }) => <h1 {...props} className="text-xl sm:text-2xl font-bold text-cal-poly-primary mb-3 sm:mb-4 mt-4 sm:mt-6 first:mt-0" />,
              h2: ({ node, ...props }) => <h2 {...props} className="text-lg sm:text-xl font-semibold text-cal-poly-primary mb-2 sm:mb-3 mt-3 sm:mt-5 first:mt-0" />,
              h3: ({ node, ...props }) => <h3 {...props} className="text-base sm:text-lg font-semibold text-cal-poly-primary mb-2 mt-3 sm:mt-4 first:mt-0" />,
              strong: ({ node, ...props }) => <strong {...props} className="font-semibold text-cal-poly-gray-dark" />,
              em: ({ node, ...props }) => <em {...props} className="italic" />,
              code: ({ node, ...props }) => <code {...props} className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs sm:text-sm font-mono break-words" />,
              pre: ({ node, ...props }) => <pre {...props} className="bg-gray-100 text-gray-800 p-2 sm:p-3 rounded-lg text-xs sm:text-sm font-mono overflow-x-auto mb-2 sm:mb-3" />,
              blockquote: ({ node, ...props }) => <blockquote {...props} className="border-l-4 border-cal-poly-primary pl-3 sm:pl-4 py-2 bg-gray-50 mb-2 sm:mb-3 italic" />
            }}
          >
            {message.content}
            </ReactMarkdown>
            </Suspense>
        )}
      </div>

      {message.role === 'assistant' && !isStreaming && (
        <div className="ml-8 sm:ml-11 mt-2 sm:mt-3 flex flex-wrap items-center gap-1 sm:gap-2">
          <button 
            onClick={() => onCopy(index, message.content)}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
          >
            {copiedMessageIndex === index ? (
              <>
                  <Suspense fallback={null}>
                    <CheckIcon className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                  </Suspense>
                <span className="hidden sm:inline">Copied!</span>
                <span className="sm:hidden">✓</span>
              </>
            ) : (
              <>
                  <Suspense fallback={null}>
                    <CopyIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Suspense>
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>
          <button 
            onClick={onRegenerate}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
          >
              <Suspense fallback={null}>
                <RotateCwIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              </Suspense>
            <span className="hidden sm:inline">Regenerate</span>
          </button>
          <button
            onClick={() => onExport(message.content)}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
          >
              <Suspense fallback={null}>
                <DownloadIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              </Suspense>
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      )}

      {message.sources && message.sources.length > 0 && (
        <div className="ml-8 sm:ml-11 mt-3 sm:mt-4 p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <strong className="text-green-800 font-semibold text-sm sm:text-base">Sources from Cal Poly</strong>
          </div>
          <ol className="list-decimal list-inside space-y-1 sm:space-y-2">
            {message.sources.map((source: { url: string; title: string; }, sourceIndex: number) => (
              <li key={sourceIndex} className="text-xs sm:text-sm">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-700 hover:text-green-900 underline font-medium transition-colors ml-1 break-words"
                >
                  {source.title}
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}

      {message.suggestions && message.suggestions.length > 0 && (
        <div className="ml-8 sm:ml-11 mt-3 sm:mt-4 flex flex-wrap gap-2">
          {message.suggestions.map((suggestion: string, idx: number) => {
            const colorClasses = [
              'bg-green-50 text-green-700 border-green-200',
              'bg-amber-50 text-amber-700 border-amber-200',
              'bg-blue-50 text-blue-700 border-blue-200',
            ];
            const classes = colorClasses[idx % colorClasses.length];
            return (
              <div
                key={idx}
                className={`px-3 py-1 rounded-full border text-xs sm:text-sm ${classes}`}
              >
                {suggestion}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
