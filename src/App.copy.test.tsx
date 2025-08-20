import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

vi.mock('./hooks/useSettings', () => ({
  useSettings: () => ({
    apiKey: '',
    setApiKey: vi.fn(),
    model: 'gpt-4',
    setModel: vi.fn(),
    searchDepth: 'medium',
    setSearchDepth: vi.fn(),
    forceSearch: false,
    setForceSearch: vi.fn(),
    saveKey: vi.fn(),
    forgetKey: vi.fn(),
  })
}));

vi.mock('./hooks/useChat', () => ({
  useChat: () => ({
    messages: [{ role: 'assistant', content: 'hello' }],
    input: '',
    isLoading: false,
    streamingMessageIndex: null,
    chatRef: { current: null },
    setInput: vi.fn(),
    ask: vi.fn(),
    clearScreen: vi.fn(),
    handleRegenerate: vi.fn(),
    processFileForInstantReply: vi.fn(),
    processFileForComment: vi.fn(),
    missingKey: false,
  })
}));

describe('clipboard copy', () => {
  it('alerts when copy fails', async () => {
    (navigator as any).clipboard = {
      writeText: vi.fn().mockRejectedValue(new Error('denied')),
    };
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<App />);
    const btn = await screen.findByText('Copy');
    await fireEvent.click(btn);
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    alertSpy.mockRestore();
  });
});
