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
    isStreaming: false,
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

  it('renders the tools that were used for an assistant answer', () => {
    const messageWithTools: MessageType = {
      ...message,
      toolsUsed: ['web_search', 'cla_guidance'],
    };

    render(<Message {...defaultProps} message={messageWithTools} />);

    expect(screen.getByText('Tools used')).toBeInTheDocument();
    expect(screen.getByText('Web search')).toBeInTheDocument();
    expect(screen.getByText('CLA guidance')).toBeInTheDocument();
  });

  it('does not render sources when not available', () => {
    const messageWithoutSource = { ...message, sources: undefined };
    render(<Message {...defaultProps} message={messageWithoutSource} />);
    expect(screen.queryByText('Test Source')).not.toBeInTheDocument();
  });

  it('renders suggestions when provided', () => {
    const messageWithSuggestions = { ...message, suggestions: ['Follow-up one', 'Follow-up two'] };
    render(<Message {...defaultProps} message={messageWithSuggestions} />);
    expect(screen.getByText('Follow-up one')).toBeInTheDocument();
    expect(screen.getByText('Follow-up two')).toBeInTheDocument();
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

  it('hides action buttons when message is streaming', () => {
    render(<Message {...defaultProps} isStreaming={true} />);
    expect(screen.queryByText('Copy')).not.toBeInTheDocument();
    expect(screen.queryByText('Regenerate')).not.toBeInTheDocument();
    expect(screen.queryByText('Export')).not.toBeInTheDocument();
  });

  it('shows action buttons when message is not streaming', () => {
    render(<Message {...defaultProps} isStreaming={false} />);
    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(screen.getByText('Regenerate')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('displays file attachment when present', () => {
    const messageWithAttachment: MessageType = {
      role: 'user',
      content: 'Email content here',
      attachment: {
        fileName: 'test-email.eml',
        type: 'eml'
      }
    };

    render(<Message {...defaultProps} message={messageWithAttachment} />);
    expect(screen.getByText('Email Attachment')).toBeInTheDocument();
    expect(screen.getByText('test-email.eml')).toBeInTheDocument();
  });

  it('truncates long email content and toggles on click', () => {
    const longContent = new Array(205).fill('word').join(' ');
    const messageWithAttachment: MessageType = {
      role: 'user',
      content: longContent,
      attachment: {
        fileName: 'long-email.eml',
        type: 'eml'
      }
    };

    render(<Message {...defaultProps} message={messageWithAttachment} />);
    expect(screen.getByText(/Email Attachment/)).toBeInTheDocument();
    expect(screen.getByText('long-email.eml')).toBeInTheDocument();
    expect(screen.getByText(/Show More/)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Show More/));
    expect(screen.getByText(/Show Less/)).toBeInTheDocument();
    expect(screen.getByText(longContent)).toBeInTheDocument();
  });

  it('does not display attachment section when no attachment', () => {
    render(<Message {...defaultProps} />);
    expect(screen.queryByText('Email Attachment')).not.toBeInTheDocument();
  });

  it('calls onSuggestionClick when suggestion button is clicked', () => {
    const onSuggestionClick = vi.fn();
    const messageWithSuggestions = { ...message, suggestions: ['Follow-up one', 'Follow-up two'] };
    render(<Message {...defaultProps} message={messageWithSuggestions} onSuggestionClick={onSuggestionClick} />);
    
    const suggestionButton = screen.getByText('Follow-up one').closest('button');
    expect(suggestionButton).toBeInTheDocument();
    
    fireEvent.click(suggestionButton!);
    expect(onSuggestionClick).toHaveBeenCalledWith('Follow-up one');
  });

  it('renders suggestions with Ask arrow and improved styling', () => {
    const messageWithSuggestions = { ...message, suggestions: ['Follow-up one', 'Follow-up two'] };
    render(<Message {...defaultProps} message={messageWithSuggestions} />);
    
    expect(screen.getByText('Follow-up one')).toBeInTheDocument();
    expect(screen.getByText('Follow-up two')).toBeInTheDocument();
    expect(screen.getAllByText('Ask →')).toHaveLength(2);
  });

  it('renders Markdown formatting in suggestions', () => {
    const messageWithSuggestions = { ...message, suggestions: ['**Follow-up one**'] };
    render(<Message {...defaultProps} message={messageWithSuggestions} />);

    const suggestionButton = screen.getByRole('button', { name: /Follow-up one/ });
    expect(suggestionButton.querySelector('span')).toHaveClass('font-semibold');
    expect(suggestionButton.querySelector('strong')).toHaveTextContent('Follow-up one');
  });

  it('renders Markdown tables with readable table styling', () => {
    const tableMessage = {
      ...message,
      content: '| Percentage | Grade |\n| --- | --- |\n| 93–100% | A |',
    };
    render(<Message {...defaultProps} message={tableMessage} />);

    const table = screen.getByRole('table');
    expect(table).toHaveClass('w-full', 'border-collapse');
    expect(screen.getByRole('columnheader', { name: 'Percentage' })).toHaveClass('bg-gray-50', 'font-semibold');
    expect(screen.getByRole('cell', { name: '93–100%' })).toHaveClass('border');
  });

  it('offers a retry action for a failed assistant response', () => {
    const onRetry = vi.fn();
    render(
      <Message
        {...defaultProps}
        message={{ role: 'assistant', content: 'Something went wrong.', isError: true }}
        onRetry={onRetry}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('reports elapsed time and cost at the bottom of an assistant answer', () => {
    const timedMessage: MessageType = {
      ...message,
      sources: undefined,
      elapsedMs: 23_000,
      costUsd: 0.002,
    };
    render(<Message {...defaultProps} message={timedMessage} />);

    const stats = screen.getByText('23 seconds • 0.2¢');
    expect(stats).toBeInTheDocument();
  });

  it('renders only the elapsed time when cost is unavailable', () => {
    const timedOnlyMessage: MessageType = { ...message, sources: undefined, elapsedMs: 9_400 };
    render(<Message {...defaultProps} message={timedOnlyMessage} />);

    expect(screen.getByText('9.4 seconds')).toBeInTheDocument();
    expect(screen.queryByText(/¢/)).not.toBeInTheDocument();
  });

  it('does not report query stats without timing data', () => {
    render(<Message {...defaultProps} />);
    expect(screen.queryByText(/seconds/)).not.toBeInTheDocument();
  });

  it('does not report query stats for user or error messages', () => {
    render(
      <Message {...defaultProps} message={{ role: 'user', content: 'Hi', elapsedMs: 23_000, costUsd: 0.002 }} />
    );
    render(
      <Message
        {...defaultProps}
        message={{ role: 'assistant', content: 'Failed', isError: true, elapsedMs: 23_000, costUsd: 0.002 }}
      />
    );
    expect(screen.queryByText(/•/)).not.toBeInTheDocument();
  });
});
