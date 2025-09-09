import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';

// Mock the useSettings hook
vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({
    apiKey: 'test-api-key',
    setApiKey: vi.fn(),
    model: 'gpt-4.1',
    setModel: vi.fn(),
    searchDepth: 'medium' as const,
    setSearchDepth: vi.fn(),
    forceSearch: false,
    setForceSearch: vi.fn(),
    saveKey: vi.fn(),
    forgetKey: vi.fn(),
  })
}));

// Mock the useChat hook to test suggestion functionality
const mockAsk = vi.fn();
const mockSetInput = vi.fn();

vi.mock('../hooks/useChat', () => ({
  useChat: () => ({
    messages: [
      {
        role: 'assistant',
        content: 'Here is some helpful information about Cal Poly.',
        suggestions: ['What are the graduation requirements?', 'How do I change my major?']
      }
    ],
    input: '',
    isLoading: false,
    streamingMessageIndex: null,
    chatRef: { current: null },
    setInput: mockSetInput,
    ask: mockAsk,
    clearScreen: vi.fn(),
    handleRegenerate: vi.fn(),
    processFileForInstantReply: vi.fn(),
    processFileForComment: vi.fn(),
  })
}));

describe('Suggestion Click Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets input and calls ask when suggestion is clicked', () => {
    render(<App />);
    
    // Find the first suggestion button
    const suggestionButton = screen.getByText('What are the graduation requirements?').closest('button');
    expect(suggestionButton).toBeInTheDocument();
    
    // Click the suggestion
    fireEvent.click(suggestionButton!);
    
    // Verify that setInput was called with the suggestion text
    expect(mockSetInput).toHaveBeenCalledWith('What are the graduation requirements?');
    
    // Verify that ask was called with the suggestion text (our fix)
    expect(mockAsk).toHaveBeenCalledWith('What are the graduation requirements?');
  });

  it('sets input and calls ask for second suggestion when clicked', () => {
    render(<App />);
    
    // Find the second suggestion button
    const suggestionButton = screen.getByText('How do I change my major?').closest('button');
    expect(suggestionButton).toBeInTheDocument();
    
    // Click the suggestion
    fireEvent.click(suggestionButton!);
    
    // Verify that setInput was called with the suggestion text
    expect(mockSetInput).toHaveBeenCalledWith('How do I change my major?');
    
    // Verify that ask was called with the suggestion text (our fix)
    expect(mockAsk).toHaveBeenCalledWith('How do I change my major?');
  });

  it('renders suggestion buttons with proper styling and text', () => {
    render(<App />);
    
    // Check that suggestions are rendered with "Ask →" indicator
    expect(screen.getByText('What are the graduation requirements?')).toBeInTheDocument();
    expect(screen.getByText('How do I change my major?')).toBeInTheDocument();
    expect(screen.getAllByText('Ask →')).toHaveLength(2);
  });
});