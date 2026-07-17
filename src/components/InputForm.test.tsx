import { render, screen, fireEvent } from '@testing-library/react';
import InputForm from './InputForm';
import { describe, it, expect, vi } from 'vitest';

describe('InputForm', () => {
  const defaultProps = {
    input: '',
    isLoading: false,
    onInputChange: vi.fn(),
    onAsk: vi.fn(),
    onNewChat: vi.fn(),
    onKeyDown: vi.fn(),
  };

  it('renders the input form', () => {
    render(<InputForm {...defaultProps} />);
    expect(screen.getByPlaceholderText('Ask a Cal Poly question, or paste an email thread…')).toBeInTheDocument();
  });

  it('calls onInputChange when textarea value changes', () => {
    render(<InputForm {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Ask a Cal Poly question, or paste an email thread…');
    fireEvent.change(textarea, { target: { value: 'test input' } });
    expect(defaultProps.onInputChange).toHaveBeenCalledWith('test input');
  });

  it('disables the ask button when input is empty or loading', () => {
    const { rerender } = render(<InputForm {...defaultProps} />);
    const askButton = screen.getByText('Ask Poly Advisor');
    expect(askButton).toBeDisabled();

    rerender(<InputForm {...defaultProps} input="test" />);
    expect(askButton).not.toBeDisabled();

    rerender(<InputForm {...defaultProps} isLoading={true} input="test" />);
    expect(askButton).toBeDisabled();
  });

  it('calls onAsk when ask button is clicked', () => {
    render(<InputForm {...defaultProps} input="test" />);
    const askButton = screen.getByText('Ask Poly Advisor');
    fireEvent.click(askButton);
    expect(defaultProps.onAsk).toHaveBeenCalled();
  });

  it('calls onNewChat when the button is clicked', () => {
    render(<InputForm {...defaultProps} />);
    const newChatButton = screen.getByText('New Chat');
    fireEvent.click(newChatButton);
    expect(defaultProps.onNewChat).toHaveBeenCalled();
  });

  it('calls onKeyDown when a key is pressed in the textarea', () => {
    render(<InputForm {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Ask a Cal Poly question, or paste an email thread…');
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });
    expect(defaultProps.onKeyDown).toHaveBeenCalled();
  });

  it('offers keyboard-accessible email file pickers for both email workflows', () => {
    const onFileInstantReply = vi.fn();
    const onFileComment = vi.fn();
    render(
      <InputForm
        {...defaultProps}
        onFileInstantReply={onFileInstantReply}
        onFileComment={onFileComment}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Draft reply from email' }));
    const instantReplyInput = screen.getByLabelText('Email file for an instant reply');
    fireEvent.change(instantReplyInput, {
      target: { files: [new File(['From: student'], 'question.eml', { type: 'message/rfc822' })] },
    });
    expect(onFileInstantReply).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Add email to prompt' }));
    const commentInput = screen.getByLabelText('Email file to add to the prompt');
    fireEvent.change(commentInput, {
      target: { files: [new File(['From: student'], 'context.eml', { type: 'message/rfc822' })] },
    });
    expect(onFileComment).toHaveBeenCalledOnce();
  });

  it('rejects unsupported files with visible feedback', () => {
    const onFileInstantReply = vi.fn();
    render(<InputForm {...defaultProps} onFileInstantReply={onFileInstantReply} />);

    fireEvent.change(screen.getByLabelText('Email file for an instant reply'), {
      target: { files: [new File(['not an email'], 'notes.txt', { type: 'text/plain' })] },
    });

    expect(onFileInstantReply).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Only .eml email files are supported.');
  });
});
