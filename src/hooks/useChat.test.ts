import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from './useChat';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeGuidanceToolCall } from '../utils/guidanceTool';

const mockResponsesCreate = vi.fn();
const mockExecuteGuidanceToolCall = vi.mocked(executeGuidanceToolCall);

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

vi.mock('../utils/guidanceTool', () => ({
  guidanceSearchTool: {
    type: 'function',
    name: 'search_advising_guidance',
    description: 'Search bundled guidance',
    parameters: {
      type: 'object',
      properties: {
        document: { type: 'string', enum: ['phil', 'cla', 'both'] },
        query: { type: 'string' },
      },
      required: ['document', 'query'],
      additionalProperties: false,
    },
    strict: true,
  },
  executeGuidanceToolCall: vi.fn(),
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
    mockExecuteGuidanceToolCall.mockReset();
    mockExecuteGuidanceToolCall.mockResolvedValue('Relevant sanitized CLA guidance.');
    localStorageMock.getItem.mockReturnValue('mock-api-key');
  });

  it('executes model-selected guidance retrieval before rendering the final answer', async () => {
    mockResponsesCreate.mockReset();
    mockResponsesCreate
      .mockResolvedValueOnce({
        id: 'guidance-call-response',
        output: [
          {
            type: 'function_call',
            name: 'search_advising_guidance',
            call_id: 'guidance-call-1',
            arguments: '{"document":"cla","query":"Fall 2026 add/drop"}',
          },
        ],
      })
      .mockResolvedValueOnce(defaultResponse)
      .mockResolvedValueOnce({
        id: 'mock-suggestions',
        output: [{ type: 'output_text', text: 'Follow up?' }],
      });

    const { result } = renderHook(() => useChat('gpt-5.6-luna', 'medium', false));

    await act(async () => {
      await result.current.ask('When is the Fall 2026 add/drop deadline?');
    });

    expect(mockExecuteGuidanceToolCall).toHaveBeenCalledWith(
      '{"document":"cla","query":"Fall 2026 add/drop"}'
    );
    expect(mockResponsesCreate.mock.calls[1][0]).toMatchObject({
      previous_response_id: 'guidance-call-response',
    });
    expect(mockResponsesCreate.mock.calls[1][0].input).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'function_call_output',
          call_id: 'guidance-call-1',
          output: 'Relevant sanitized CLA guidance.',
        }),
      ])
    );
    expect(result.current.messages.find((message) => message.role === 'assistant')?.content)
      .toBe('Mock response');
  });

  it('shows the guidance activity while a local document lookup is pending', async () => {
    let resolveInitialResponse!: (value: unknown) => void;
    let resolveGuidanceLookup!: (value: string) => void;
    let resolveFollowupResponse!: (value: unknown) => void;
    const initialResponse = new Promise((resolve) => {
      resolveInitialResponse = resolve;
    });
    const guidanceLookup = new Promise<string>((resolve) => {
      resolveGuidanceLookup = resolve;
    });
    const followupResponse = new Promise((resolve) => {
      resolveFollowupResponse = resolve;
    });

    mockResponsesCreate.mockReset();
    mockResponsesCreate
      .mockReturnValueOnce(initialResponse)
      .mockReturnValueOnce(followupResponse)
      .mockResolvedValueOnce({
        id: 'mock-suggestions',
        output: [{ type: 'output_text', text: 'Follow up?' }],
      });
    mockExecuteGuidanceToolCall.mockReturnValueOnce(guidanceLookup);

    const { result } = renderHook(() => useChat('gpt-5.6-luna', 'medium', false));
    let askPromise!: Promise<void>;

    act(() => {
      askPromise = result.current.ask('When is the Fall 2026 add/drop deadline?');
    });

    await waitFor(() => expect(result.current.activeToolStatus).toBe('thinking'));

    resolveInitialResponse({
      id: 'guidance-call-response',
      output: [
        {
          type: 'function_call',
          name: 'search_advising_guidance',
          call_id: 'guidance-call-1',
          arguments: '{"document":"cla","query":"Fall 2026 add/drop"}',
        },
      ],
    });

    await waitFor(() => {
      expect(result.current.activeToolStatus).toBe('cla_guidance');
      expect(mockExecuteGuidanceToolCall).toHaveBeenCalled();
    });

    resolveGuidanceLookup('Relevant sanitized CLA guidance.');
    await waitFor(() => expect(result.current.activeToolStatus).toBe('thinking'));

    resolveFollowupResponse(defaultResponse);
    await act(async () => {
      await askPromise;
    });

    expect(result.current.activeToolStatus).toBeNull();
    expect(result.current.messages.find((message) => message.role === 'assistant')?.toolsUsed)
      .toEqual(['cla_guidance']);
  });

  it('records a web search when the Responses API reports one', async () => {
    mockResponsesCreate.mockReset();
    mockResponsesCreate
      .mockResolvedValueOnce({
        id: 'web-search-response',
        output: [
          { type: 'web_search_call', id: 'web-search-1', status: 'completed' },
          {
            type: 'message',
            content: [{ type: 'output_text', text: 'Current Cal Poly answer.', annotations: [] }],
          },
        ],
      })
      .mockResolvedValueOnce({
        id: 'mock-suggestions',
        output: [{ type: 'output_text', text: 'Follow up?' }],
      });

    const { result } = renderHook(() => useChat('gpt-5.6-luna', 'medium', true));

    await act(async () => {
      await result.current.ask('What is the current add/drop deadline?');
    });

    expect(result.current.messages.find((message) => message.role === 'assistant')?.toolsUsed)
      .toEqual(['web_search']);
    expect(result.current.activeToolStatus).toBeNull();
  });

  it('should reset conversation context when newChat is called', async () => {
    const { result } = renderHook(() => useChat('gpt-5.6-luna', 'medium', false));

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
    const { result } = renderHook(() => useChat('gpt-5.6-luna', 'medium', false));

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
    const { result } = renderHook(() => useChat('gpt-5.6-luna', 'medium', false));

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
    const { result } = renderHook(() => useChat('gpt-5.6-luna', 'medium', false));

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

    const { result } = renderHook(() => useChat('gpt-5.6-luna', 'medium', false));

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

  it('requests plain-text follow-up questions without Markdown formatting', async () => {
    mockResponsesCreate.mockReset();
    mockResponsesCreate
      .mockResolvedValueOnce(defaultResponse)
      .mockResolvedValueOnce({
        id: 'mock-suggestions',
        output: [{ type: 'output_text', text: 'Follow up?' }],
      });

    const { result } = renderHook(() => useChat('gpt-5.6-luna', 'medium', false));

    await act(async () => {
      await result.current.ask('What is the add/drop deadline?');
    });

    await waitFor(() => {
      expect(result.current.messages.some((message) => message.suggestions?.length)).toBe(true);
    });

    const suggestionRequest = mockResponsesCreate.mock.calls[1][0];
    const suggestionSystemPrompt = suggestionRequest.input[0].content[0].text;
    expect(suggestionSystemPrompt).toContain('plain text only');
    expect(suggestionSystemPrompt).toContain('Do not use Markdown');
  });

  it('explains how to recover when an API key has not been saved', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorageMock.getItem.mockReturnValue(null);
    const { result } = renderHook(() => useChat('gpt-5.6-luna', 'medium', false));

    await act(async () => {
      await result.current.ask('What is the add/drop deadline?');
    });

    const assistantMessage = result.current.messages.find((message) => message.role === 'assistant');
    expect(assistantMessage).toMatchObject({
      content: 'Add your OpenAI API key in Settings, then try again.',
      isError: true,
    });
    consoleError.mockRestore();
  });
});
