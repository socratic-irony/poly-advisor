import { useState } from 'react';
import { Copy, Check, RotateCw, Download, Mail, Wrench } from 'lucide-react';
import Markdown from 'markdown-to-jsx';
import { Message as MessageType } from '../types';
import { formatQueryStats } from '../utils/cost';

interface MessageProps {
  message: MessageType;
  index: number;
  isStreaming: boolean;
  copiedMessageIndex: number | null;
  onCopy: (index: number, content: string) => void;
  onRegenerate: () => void;
  onExport: (content: string) => void;
  onRetry?: () => void;
  onSuggestionClick?: (suggestion: string) => void;
}

function FormattedMarkdown({ content, inline = false }: { content: string; inline?: boolean }) {
  return (
    <Markdown
      options={{
        overrides: {
          a: ({ ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" className="text-cal-poly-primary hover:text-cal-poly-green-light underline break-words" />
          ),
          p: inline
            ? ({ ...props }) => <span {...props} />
            : ({ ...props }) => <p {...props} className="mb-2.5 sm:mb-3 last:mb-0" />,
          ul: ({ ...props }) => <ul {...props} className="list-disc ml-5 sm:ml-6 mb-2.5 sm:mb-3 space-y-1 last:mb-0" />,
          ol: ({ ...props }) => <ol {...props} className="list-decimal ml-5 sm:ml-6 mb-2.5 sm:mb-3 space-y-1 last:mb-0" />,
          li: ({ ...props }) => <li {...props} className="leading-relaxed pl-1" />,
          h1: ({ ...props }) => <h1 {...props} className="text-lg sm:text-xl font-bold text-cal-poly-primary tracking-tight mt-5 first:mt-0 mb-2.5" />,
          h2: ({ ...props }) => <h2 {...props} className="text-base sm:text-lg font-semibold text-cal-poly-primary tracking-tight mt-4 first:mt-0 mb-2" />,
          h3: ({ ...props }) => <h3 {...props} className="text-sm sm:text-base font-semibold text-cal-poly-gray-dark mt-3 first:mt-0 mb-1.5" />,
          strong: ({ ...props }) => <strong {...props} className="font-semibold text-cal-poly-gray-dark" />,
          em: ({ ...props }) => <em {...props} className="italic" />,
          hr: ({ ...props }) => <hr {...props} className="my-4 border-gray-200" />,
          code: ({ ...props }) => <code {...props} className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs sm:text-sm font-mono break-words" />,
          pre: ({ ...props }) => <pre {...props} className="bg-gray-50 border border-gray-200 text-gray-800 p-3 rounded-lg text-xs sm:text-sm font-mono overflow-x-auto mb-3 last:mb-0" />,
          blockquote: ({ ...props }) => <blockquote {...props} className="border-l-2 border-green-200 pl-3 py-0.5 my-2.5 text-cal-poly-gray italic last:mb-0" />,
          table: ({ ...props }) => <table {...props} className="w-full border-collapse mb-3 text-left" />,
          thead: ({ ...props }) => <thead {...props} className="bg-gray-50" />,
          tr: ({ ...props }) => <tr {...props} className="border-b border-gray-200" />,
          th: ({ ...props }) => <th {...props} className="border border-gray-200 bg-gray-50 px-2 sm:px-3 py-2 font-semibold text-left" />,
          td: ({ ...props }) => <td {...props} className="border border-gray-200 px-2 sm:px-3 py-2 align-top" />,
        },
      }}
    >
      {content}
    </Markdown>
  );
}

export default function Message({ message, index, isStreaming, copiedMessageIndex, onCopy, onRegenerate, onExport, onRetry, onSuggestionClick }: MessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const words = message.content.trim().split(/\s+/);
  const shouldTruncate = Boolean(message.attachment) && words.length > 200;
  const displayContent = shouldTruncate && !isExpanded
    ? words.slice(0, 200).join(' ') + '...'
    : message.content;

  const showQueryStats =
    message.role === 'assistant' && !isStreaming && !message.isError &&
    (message.elapsedMs != null || message.costUsd != null);

  return (
    <div className="group">
      <div className="flex items-center gap-2 sm:gap-2.5 mb-2">
        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs sm:text-sm ${
          message.role === 'assistant'
            ? 'bg-green-100 text-green-700'
            : message.role === 'user'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-700'
        }`}>
          {message.role === 'assistant' ? '🎓' : message.role === 'user' ? '👤' : '⚙️'}
        </div>
        <span className="font-semibold text-cal-poly-gray text-xs sm:text-sm uppercase tracking-wide">
          {message.role === 'assistant' ? 'Poly Advisor' : message.role === 'user' ? 'You' : 'System'}
        </span>
      </div>
      <div className="ml-[34px] sm:ml-[38px] text-cal-poly-gray-dark leading-relaxed text-[15px]">
        {message.attachment ? (
          <div className="mb-3 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
              <span className="text-gray-800 font-medium text-xs sm:text-sm">Email Attachment</span>
              {message.attachment.fileName && (
                <span className="ml-auto text-gray-600 text-xs truncate">{message.attachment.fileName}</span>
              )}
            </div>
              <FormattedMarkdown content={displayContent} />
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
            <FormattedMarkdown content={message.content} />
        )}
      </div>

      {message.role === 'assistant' && !isStreaming && (
        <div className="ml-[34px] sm:ml-[38px] mt-2 sm:mt-3 flex flex-wrap items-center gap-1">
          {message.isError ? (
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => onCopy(index, message.content)}
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-500 hover:text-cal-poly-primary hover:bg-green-50 rounded-md transition-colors"
              >
                {copiedMessageIndex === index ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-600" />
                    <span className="hidden sm:inline">Copied!</span>
                    <span className="sm:hidden">✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Copy</span>
                  </>
                )}
              </button>
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-500 hover:text-cal-poly-primary hover:bg-green-50 rounded-md transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Regenerate</span>
              </button>
              <button
                onClick={() => onExport(message.content)}
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-500 hover:text-cal-poly-primary hover:bg-green-50 rounded-md transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </>
          )}
        </div>
      )}

      {message.role === 'assistant' && !isStreaming && message.toolsUsed && message.toolsUsed.length > 0 && (
        <div className="ml-[34px] sm:ml-[38px] mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-gray-500">
          <div className="flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" />
            <span>Tools used</span>
          </div>
          {message.toolsUsed.map((tool) => (
            <span key={tool}>
              {{
                web_search: 'Web search',
                phil_guidance: 'PHIL guidance',
                cla_guidance: 'CLA guidance',
              }[tool]}
            </span>
          ))}
        </div>
      )}

      {showQueryStats && (
        <div className="ml-[34px] sm:ml-[38px] mt-1.5 text-xs font-medium text-gray-500 select-none tabular-nums">
          {formatQueryStats(message.elapsedMs, message.costUsd)}
        </div>
      )}

      {message.sources && message.sources.length > 0 && (
        <div className="ml-[34px] sm:ml-[38px] mt-3 sm:mt-4 p-3.5 bg-green-50/70 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <strong className="text-green-800 font-semibold text-xs sm:text-sm uppercase tracking-wide">Sources from Cal Poly</strong>
          </div>
          <ol className="list-decimal list-inside space-y-1">
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
        <div className="ml-[34px] sm:ml-[38px] mt-3 sm:mt-4 flex flex-wrap gap-2">
          {message.suggestions.map((suggestion: string, idx: number) => (
            <button
              key={idx}
              onClick={() => onSuggestionClick?.(suggestion)}
              className="w-full sm:w-auto px-3.5 py-2 rounded-lg border border-amber-200 bg-amber-50 text-left text-amber-900 hover:bg-amber-100 transition-colors flex items-center gap-2 group text-sm"
            >
              <span className="font-semibold">
                <FormattedMarkdown content={suggestion} inline />
              </span>
              <span className="ml-auto text-xs text-amber-700 group-hover:text-amber-900 whitespace-nowrap">Ask →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
