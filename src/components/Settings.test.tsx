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
    model: 'gpt-4o',
    onModelChange: vi.fn(),
  };

  it('renders the settings section', () => {
    render(<Settings {...defaultProps} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
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
    fireEvent.change(select, { target: { value: 'gpt-4.1-mini' } });
    expect(defaultProps.onModelChange).toHaveBeenCalledWith('gpt-4.1-mini');
  });
});
