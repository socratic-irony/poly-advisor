import { render, screen } from '@testing-library/react';
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
    expect(screen.getByText('Drag .eml email files here for instant replies!')).toBeInTheDocument();
  });

  it('displays file attachment information', () => {
    render(<ChatView {...defaultProps} />);
    expect(screen.getByText('Email Attachment')).toBeInTheDocument();
    expect(screen.getByText('test.eml')).toBeInTheDocument();
    expect(screen.getByText('eml')).toBeInTheDocument();
  });
});
