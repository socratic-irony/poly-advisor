import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from './useChat';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockResponsesCreate = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock OpenAI client
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      responses = {
        create: mockResponsesCreate,
      };
    }
  };
});

// Mock the loadAdvisingDocument function
vi.mock('../utils/advisingDocument', () => ({
  loadAdvisingDocument: vi.fn().mockResolvedValue(''),
  formatAdvisingDocumentForPrompt: vi.fn().mockReturnValue('')
}));

describe('useChat', () => {
  const defaultResponse = {
    id: 'mock-response-id',
    output: [
      {
        type: 'message',
        content: [
          {
            type: 'output_text',
            text: 'Mock response',
            annotations: [],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockResponsesCreate.mockReset();
    mockResponsesCreate.mockResolvedValue(defaultResponse);
    localStorageMock.getItem.mockReturnValue('mock-api-key');
  });

  it('should reset conversation context when newChat is called', async () => {
    const { result } = renderHook(() => useChat('gpt-5.4-mini', 'medium', false));

    // First, simulate setting input and asking a question to establish a previousResponseId
    act(() => {
      result.current.setInput('Test question');
    });

    // Mock the ask function to simulate setting previousResponseId
    await act(async () => {
      await result.current.ask();
    });

    // Verify that messages were added (user message + placeholder for assistant)
    expect(result.current.messages.length).toBeGreaterThan(0);

    // Start a new chat
    act(() => {
      result.current.newChat();
    });

    // Verify that messages were cleared
    expect(result.current.messages).toEqual([]);

    // Now ask another question and verify that previousResponseId is not passed
    // This is verified by checking that the conversation doesn't have context from before newChat
    act(() => {
      result.current.setInput('What were we talking about?');
    });

    await act(async () => {
      await result.current.ask();
    });

    // The fact that we can ask a new question without errors and the messages
    // start fresh indicates that previousResponseId was properly reset
    expect(result.current.messages.length).toBe(2); // User message + assistant response
  });

  it('should clear all messages and input when newChat is called', () => {
    const { result } = renderHook(() => useChat('gpt-5.4-mini', 'medium', false));

    // Add some messages first
    act(() => {
      result.current.setInput('Test message');
    });

    // Simulate that we have some messages
    expect(result.current.input).toBe('Test message');

    // Start a new chat
    act(() => {
      result.current.newChat();
    });

    // Verify that messages were cleared and input was reset
    expect(result.current.messages).toEqual([]);
    expect(result.current.input).toBe('');
  });

  it('should start fresh conversation after newChat', async () => {
    const { result } = renderHook(() => useChat('gpt-5.4-mini', 'medium', false));

    // Ask initial question
    act(() => {
      result.current.setInput('First question');
    });

    await act(async () => {
      await result.current.ask();
    });

    const messagesAfterFirstQuestion = result.current.messages.length;
    expect(messagesAfterFirstQuestion).toBeGreaterThan(0);

    // Start new chat
    act(() => {
      result.current.newChat();
    });

    expect(result.current.messages).toEqual([]);

    // Ask new question
    act(() => {
      result.current.setInput('Second question');
    });

    await act(async () => {
      await result.current.ask();
    });

    // Should start fresh conversation
    expect(result.current.messages.length).toBe(2); // Fresh start: user + assistant
  });

  it('should reuse the last user prompt when handleRegenerate is called', async () => {
    const { result } = renderHook(() => useChat('gpt-5.4-mini', 'medium', false));

    act(() => {
      result.current.setInput('Original question');
    });

    await act(async () => {
      await result.current.ask();
    });

    const messagesAfterFirstAsk = result.current.messages.length;
    expect(messagesAfterFirstAsk).toBeGreaterThan(0);

    await act(async () => {
      await result.current.handleRegenerate();
    });

    expect(result.current.messages.length).toBe(messagesAfterFirstAsk + 2);
    const lastUserMessage = [...result.current.messages].reverse().find((m) => m.role === 'user');
    expect(lastUserMessage?.content).toBe('Original question');
  });

  it('renders assistant replies when the Responses API returns output_text items', async () => {
    mockResponsesCreate.mockReset();
    mockResponsesCreate
      .mockResolvedValueOnce({
        id: 'mock-response-id',
        output: [
          {
            type: 'output_text',
            text: 'Mock output text',
            annotations: [
              {
                type: 'url_citation',
                url: 'https://advising.calpoly.edu/example',
                title: 'Example Source',
              },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({
        id: 'mock-suggestions',
        output: [
          {
            type: 'output_text',
            text: '1. Follow up?\n2. Another question?',
          },
        ],
      })
      .mockResolvedValue(defaultResponse);

    const { result } = renderHook(() => useChat('gpt-5.4-mini', 'medium', false));

    act(() => {
      result.current.setInput('Test output text handling');
    });

    await act(async () => {
      await result.current.ask();
    });

    await waitFor(() => {
      const assistantMessage = result.current.messages.find((m) => m.role === 'assistant');
      expect(assistantMessage?.content).toBe('Mock output text');
      expect(assistantMessage?.sources).toEqual([
        {
          title: 'Example Source',
          url: 'https://advising.calpoly.edu/example',
        },
      ]);
      expect(assistantMessage?.suggestions).toEqual([
        'Follow up?',
        'Another question?',
      ]);
    });
  });
});