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
    onClearScreen: vi.fn(),
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

  it('calls onNewChat when new chat button is clicked', () => {
    render(<InputForm {...defaultProps} />);
    const newChatButton = screen.getByText('New Chat');
    fireEvent.click(newChatButton);
    expect(defaultProps.onNewChat).toHaveBeenCalled();
  });

  it('calls onClearScreen when clear screen button is clicked', () => {
    render(<InputForm {...defaultProps} />);
    const clearScreenButton = screen.getByText('Clear Screen');
    fireEvent.click(clearScreenButton);
    expect(defaultProps.onClearScreen).toHaveBeenCalled();
  });

  it('calls onKeyDown when a key is pressed in the textarea', () => {
    render(<InputForm {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Ask a Cal Poly question, or paste an email thread…');
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });
    expect(defaultProps.onKeyDown).toHaveBeenCalled();
  });
});
