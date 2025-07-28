import { render, screen, fireEvent } from '@testing-library/react';
import Message from './Message';
import { describe, it, expect, vi } from 'vitest';
import { Message as MessageType } from '../types';

describe('Message', () => {
  const message: MessageType = {
    role: 'assistant',
    content: 'This is a test message.',
    sources: [{ title: 'Test Source', url: 'http://test.com' }],
  };

  const defaultProps = {
    message,
    index: 0,
    copiedMessageIndex: null,
    onCopy: vi.fn(),
    onRegenerate: vi.fn(),
    onExport: vi.fn(),
  };

  it('renders the message content', () => {
    render(<Message {...defaultProps} />);
    expect(screen.getByText('This is a test message.')).toBeInTheDocument();
  });

  it('renders sources when available', () => {
    render(<Message {...defaultProps} />);
    expect(screen.getByText('Test Source')).toBeInTheDocument();
  });

  it('does not render sources when not available', () => {
    const messageWithoutSource = { ...message, sources: undefined };
    render(<Message {...defaultProps} message={messageWithoutSource} />);
    expect(screen.queryByText('Test Source')).not.toBeInTheDocument();
  });

  it('calls onCopy when copy button is clicked', () => {
    render(<Message {...defaultProps} />);
    const copyButton = screen.getByText('Copy');
    fireEvent.click(copyButton);
    expect(defaultProps.onCopy).toHaveBeenCalledWith(0, 'This is a test message.');
  });

  it('shows "Copied!" when message is copied', () => {
    render(<Message {...defaultProps} copiedMessageIndex={0} />);
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('calls onRegenerate when regenerate button is clicked', () => {
    render(<Message {...defaultProps} />);
    const regenerateButton = screen.getByText('Regenerate');
    fireEvent.click(regenerateButton);
    expect(defaultProps.onRegenerate).toHaveBeenCalled();
  });

  it('calls onExport when export button is clicked', () => {
    render(<Message {...defaultProps} />);
    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);
    expect(defaultProps.onExport).toHaveBeenCalledWith('This is a test message.');
  });
});
