import ReactMarkdown from 'react-markdown';
import { Copy, Check, RotateCw, Download } from 'lucide-react';
import { Message as MessageType } from '../types';

interface MessageProps {
  message: MessageType;
  index: number;
  copiedMessageIndex: number | null;
  onCopy: (index: number, content: string) => void;
  onRegenerate: () => void;
  onExport: (content: string) => void;
}

export default function Message({ message, index, copiedMessageIndex, onCopy, onRegenerate, onExport }: MessageProps) {
  return (
    <div className="group">
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
        <ReactMarkdown
          components={{
            a: ({ node, ...props }) => (
              <a {...props} target="_blank" rel="noopener noreferrer" className="text-cal-poly-primary hover:text-cal-poly-green-light underline" />
            ),
            p: ({ node, ...props }) => <p {...props} className="mb-3 last:mb-0" />,
            ul: ({ node, ...props }) => <ul {...props} className="list-disc ml-6 mb-3 space-y-1" />,
            ol: ({ node, ...props }) => <ol {...props} className="list-decimal ml-6 mb-3 space-y-1" />,
            li: ({ node, ...props }) => <li {...props} className="leading-relaxed" />,
            h1: ({ node, ...props }) => <h1 {...props} className="text-2xl font-bold text-cal-poly-primary mb-4 mt-6 first:mt-0" />,
            h2: ({ node, ...props }) => <h2 {...props} className="text-xl font-semibold text-cal-poly-primary mb-3 mt-5 first:mt-0" />,
            h3: ({ node, ...props }) => <h3 {...props} className="text-lg font-semibold text-cal-poly-primary mb-2 mt-4 first:mt-0" />,
            strong: ({ node, ...props }) => <strong {...props} className="font-semibold text-cal-poly-gray-dark" />,
            em: ({ node, ...props }) => <em {...props} className="italic" />,
            code: ({ node, ...props }) => <code {...props} className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm font-mono" />,
            pre: ({ node, ...props }) => <pre {...props} className="bg-gray-100 text-gray-800 p-3 rounded-lg text-sm font-mono overflow-x-auto mb-3" />,
            blockquote: ({ node, ...props }) => <blockquote {...props} className="border-l-4 border-cal-poly-primary pl-4 py-2 bg-gray-50 mb-3 italic" />
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>

      {message.role === 'assistant' && (
        <div className="ml-11 mt-3 flex items-center gap-2">
          <button 
            onClick={() => onCopy(index, message.content)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
          >
            {copiedMessageIndex === index ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
          <button 
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
          >
            <RotateCw className="w-4 h-4" />
            Regenerate
          </button>
          <button
            onClick={() => onExport(message.content)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      )}

      {message.sources && message.sources.length > 0 && (
        <div className="ml-11 mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <strong className="text-green-800 font-semibold">Sources from Cal Poly</strong>
          </div>
          <ol className="list-decimal list-inside space-y-2">
            {message.sources.map((source: { url: string; title: string; }, sourceIndex: number) => (
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
  );
}
