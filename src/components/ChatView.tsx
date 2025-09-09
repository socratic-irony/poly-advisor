import { useState } from 'react';
import { Message as MessageType } from '../types';
import { Mail, FileText } from 'lucide-react';
import Message from './Message';

interface ChatViewProps {
  messages: MessageType[];
  isLoading: boolean;
  streamingMessageIndex: number | null;
  chatRef: React.RefObject<HTMLDivElement>;
  copiedMessageIndex: number | null;
  onCopy: (index: number, content: string) => void;
  onRegenerate: () => void;
  onExport: (content: string) => void;
  onFileInstantReply: (file: File) => void;
  onFileComment: (file: File) => void;
}

export default function ChatView({ 
  messages, 
  isLoading, 
  streamingMessageIndex, 
  chatRef, 
  copiedMessageIndex, 
  onCopy, 
  onRegenerate, 
  onExport,
  onFileInstantReply,
  onFileComment 
}: ChatViewProps) {
  const [isDragging, setIsDragging] = useState(false);

  const isValidEmlFile = (file: File) => {
    return file.name.toLowerCase().endsWith('.eml') || file.type === 'message/rfc822';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if files are being dragged (works better with external apps)
    const hasFiles = e.dataTransfer?.types?.includes('Files') || 
                    e.dataTransfer?.types?.includes('application/x-moz-file') ||
                    e.dataTransfer?.files?.length > 0;
    
    if (hasFiles) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only hide dropzone if we're actually leaving the container
    // Use relatedTarget to check if we're moving to a child element
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    // If mouse is outside the container bounds, hide the dropzone
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleInstantReplyDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer?.files || []);
    const emlFile = files.find(isValidEmlFile);
    
    if (emlFile) {
      onFileInstantReply(emlFile);
    } else if (files.length > 0) {
      // Show user feedback if they dropped non-eml files
      console.warn('Only .eml email files are supported. Please drop a .eml file.');
    }
    
    setIsDragging(false);
  };

  const handleCommentDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer?.files || []);
    const emlFile = files.find(isValidEmlFile);
    
    if (emlFile) {
      onFileComment(emlFile);
    } else if (files.length > 0) {
      // Show user feedback if they dropped non-eml files
      console.warn('Only .eml email files are supported. Please drop a .eml file.');
    }
    
    setIsDragging(false);
  };

  return (
    <div
      ref={chatRef}
      className="relative flex-1 cal-poly-card rounded-xl cal-poly-shadow-lg p-3 sm:p-4 lg:p-6 mb-3 sm:mb-6 overflow-y-auto"
      aria-live="polite"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Dropzone Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex bg-white/90 backdrop-blur-sm rounded-xl">
          {/* Left Dropzone - Instant Reply */}
          <div
            className="flex-1 p-4 m-2 border-2 border-dashed border-green-400 bg-green-50/80 rounded-lg flex flex-col items-center justify-center hover:bg-green-100/80 transition-colors"
            onDrop={handleInstantReplyDrop}
            onDragOver={handleDragOver}
          >
            <Mail className="w-12 h-12 text-green-600 mb-4" />
            <h3 className="text-lg font-semibold text-green-800 mb-2 text-center">
              Instant Reply
            </h3>
            <p className="text-green-700 text-center text-sm">
              Drop an email file (.eml) to get a draft reply
            </p>
            <div className="mt-3 text-xs text-green-600 text-center">
              Supports .eml files and message/rfc822 format
            </div>
          </div>

          {/* Right Dropzone - Comment Mode */}
          <div
            className="flex-1 p-4 m-2 border-2 border-dashed border-blue-400 bg-blue-50/80 rounded-lg flex flex-col items-center justify-center hover:bg-blue-100/80 transition-colors"
            onDrop={handleCommentDrop}
            onDragOver={handleDragOver}
          >
            <FileText className="w-12 h-12 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold text-blue-800 mb-2 text-center">
              Drop and Comment
            </h3>
            <p className="text-blue-700 text-center text-sm">
              Drop an email file (.eml) to add context before sending
            </p>
            <div className="mt-3 text-xs text-blue-600 text-center">
              Supports .eml files and message/rfc822 format
            </div>
          </div>
        </div>
      )}

      {/* Regular Chat Content */}
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
              <div className="bg-blue-50 text-blue-700 px-3 sm:px-4 py-2 rounded-lg border border-blue-200">
                <strong>New:</strong> Drag .eml email files here for instant replies!
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
              isStreaming={streamingMessageIndex === index}
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
