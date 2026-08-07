import { fireEvent, render, screen } from '@testing-library/react';
import ChatView from './ChatView';
import { describe, it, expect, vi } from 'vitest';
import { Message as MessageType } from '../types';

describe('ChatView', () => {
  const messages: MessageType[] = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!', sources: [{ title: 'source1', url: 'url1' }] },
    { 
      role: 'user', 
      content: 'Email content here', 
      attachment: { fileName: 'test.eml', type: 'eml' } 
    },
  ];

  const defaultProps = {
    messages,
    isLoading: false,
    streamingMessageIndex: null,
    chatRef: { current: null },
    copiedMessageIndex: null,
    onCopy: vi.fn(),
    onRegenerate: vi.fn(),
    onExport: vi.fn(),
    onFileInstantReply: vi.fn(),
    onFileComment: vi.fn(),
  };

  it('renders messages', () => {
    render(<ChatView {...defaultProps} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
    expect(screen.getByText('source1')).toBeInTheDocument();
  });

  it('shows loading indicator when loading', () => {
    render(<ChatView {...defaultProps} isLoading={true} />);
    expect(screen.getByText('Poly Advisor is searching & thinking...')).toBeInTheDocument();
  });

  it('shows empty state when there are no messages', () => {
    render(<ChatView {...defaultProps} messages={[]} />);
    expect(screen.getByText('Ready to help!')).toBeInTheDocument();
    expect(screen.getByText(/Reference document: 2025–2026/)).toBeInTheDocument();
  });

  it('displays file attachment information', () => {
    render(<ChatView {...defaultProps} />);
    expect(screen.getByText('Email Attachment')).toBeInTheDocument();
    expect(screen.getByText('test.eml')).toBeInTheDocument();
  });

  it('shows a clear error when a non-email file is dropped', () => {
    const { container } = render(<ChatView {...defaultProps} messages={[]} />);
    const chat = container.firstElementChild!;
    const dataTransfer = {
      types: ['Files'],
      files: [new File(['not an email'], 'notes.txt', { type: 'text/plain' })],
    };

    fireEvent.dragEnter(chat, { dataTransfer });
    fireEvent.drop(screen.getByTestId('instant-reply-dropzone'), { dataTransfer });

    expect(screen.getByRole('alert')).toHaveTextContent('Only .eml email files are supported.');
  });
});
