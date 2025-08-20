import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChat } from './useChat';
import * as EmlParser from '../utils/emlParser';

const mockCreate = vi.fn();
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({ responses: { create: mockCreate } }))
}));

vi.mock('../utils/emlParser', () => ({
  parseEmlFile: vi.fn(),
  readFileAsText: vi.fn(),
}));

const { parseEmlFile, readFileAsText } = EmlParser as any;

describe('useChat error handling', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    (parseEmlFile as any).mockReset();
    (readFileAsText as any).mockReset();
    localStorage.clear();
  });

  it('surfaces missing API key', async () => {
    const { result } = renderHook(() => useChat('gpt-4', 'medium', false));
    act(() => result.current.setInput('hello'));
    await act(async () => {
      await result.current.ask();
    });
    expect(result.current.messages[1].content).toMatch(/API key/i);
    expect(result.current.missingKey).toBe(true);
  });

  it('handles network failure', async () => {
    localStorage.setItem('openai_key', 'test');
    mockCreate.mockRejectedValue(new Error('Network down'));
    const { result } = renderHook(() => useChat('gpt-4', 'medium', false));
    act(() => result.current.setInput('hi'));
    await act(async () => {
      await result.current.ask();
    });
    expect(result.current.messages[1].content).toMatch(/Network down/);
  });

  it('warns on oversized EML files', async () => {
    (readFileAsText as any).mockResolvedValue('big');
    (parseEmlFile as any).mockReturnValue({ content: 'big', tooLarge: true });
    const file = new File(['big'], 'big.eml', { type: 'message/rfc822' });
    const { result } = renderHook(() => useChat('gpt-4', 'medium', false));
    await act(async () => {
      await result.current.processFileForInstantReply(file);
    });
    expect(result.current.messages[0].content).toMatch(/exceeds the 5 MB limit/);
  });

  it('reports file processing errors', async () => {
    (readFileAsText as any).mockRejectedValue(new Error('bad'));
    const file = new File(['bad'], 'bad.eml', { type: 'message/rfc822' });
    const { result } = renderHook(() => useChat('gpt-4', 'medium', false));
    await act(async () => {
      await result.current.processFileForInstantReply(file);
    });
    expect(result.current.messages[0].content).toMatch(/Error processing file/);
  });
});
