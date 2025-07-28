import { render, screen, fireEvent } from '@testing-library/react';
import ChatView from './ChatView';
import { describe, it, expect, vi } from 'vitest';
import { Message as MessageType } from '../types';

describe('ChatView', () => {
  const messages: MessageType[] = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!', sources: [{ title: 'source1', url: 'url1' }] },
  ];

  const defaultProps = {
    messages,
    isLoading: false,
    chatRef: { current: null },
    copiedMessageIndex: null,
    onCopy: vi.fn(),
    onRegenerate: vi.fn(),
    onExport: vi.fn(),
  };

  it('renders messages', () => {
    render(<ChatView {...defaultProps} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
    expect(screen.getByText('source1')).toBeInTheDocument();
  });

  it('shows loading indicator when loading', () => {
    render(<ChatView {...defaultProps} isLoading={true} />);
    expect(screen.getByText('Poly Advisor is thinking...')).toBeInTheDocument();
  });

  it('shows empty state when there are no messages', () => {
    render(<ChatView {...defaultProps} messages={[]} />);
    expect(screen.getByText('Ready to help!')).toBeInTheDocument();
  });
});
