import { render, screen, fireEvent } from '@testing-library/react';
import Settings from './Settings';
import { describe, it, expect, vi } from 'vitest';

describe('SettingsComponent', () => {
  const defaultProps = {
    apiKey: 'test-key',
    onApiKeyChange: vi.fn(),
    onSaveKey: vi.fn(),
    onForgetKey: vi.fn(),
    searchDepth: 'medium' as const,
    onSearchDepthChange: vi.fn(),
    forceSearch: true,
    onForceSearchChange: vi.fn(),
    model: 'gpt-5-mini',
    onModelChange: vi.fn(),
  };

  it('renders the settings form', () => {
    render(<Settings {...defaultProps} />);
    expect(screen.getByLabelText('OpenAI API key')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Forget')).toBeInTheDocument();
  });

  it('calls onApiKeyChange when the api key input changes', () => {
    render(<Settings {...defaultProps} />);
    const input = screen.getByLabelText('OpenAI API key');
    fireEvent.change(input, { target: { value: 'new-key' } });
    expect(defaultProps.onApiKeyChange).toHaveBeenCalledWith('new-key');
  });

  it('calls onSaveKey when the save button is clicked', () => {
    render(<Settings {...defaultProps} />);
    const button = screen.getByText('Save');
    fireEvent.click(button);
    expect(defaultProps.onSaveKey).toHaveBeenCalled();
  });

  it('calls onForgetKey when the forget button is clicked', () => {
    render(<Settings {...defaultProps} />);
    const button = screen.getByText('Forget');
    fireEvent.click(button);
    expect(defaultProps.onForgetKey).toHaveBeenCalled();
  });

  it('calls onSearchDepthChange when radio button is changed', () => {
    render(<Settings {...defaultProps} />);
    const highRadio = screen.getByLabelText('High search');
    fireEvent.click(highRadio);
    expect(defaultProps.onSearchDepthChange).toHaveBeenCalledWith('high');
  });

  it('calls onForceSearchChange when checkbox is clicked', () => {
    render(<Settings {...defaultProps} />);
    const checkbox = screen.getByLabelText('Force web search');
    fireEvent.click(checkbox);
    expect(defaultProps.onForceSearchChange).toHaveBeenCalledWith(false);
  });

  it('calls onModelChange when select is changed', () => {
    render(<Settings {...defaultProps} />);
    const select = screen.getByLabelText('LLM model:');
    fireEvent.change(select, { target: { value: 'gpt-5' } });
    expect(defaultProps.onModelChange).toHaveBeenCalledWith('gpt-5');
  });

  it('renders the API key help link with correct attributes', () => {
    render(<Settings {...defaultProps} />);
    const link = screen.getByText('Get your API key here...');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
