import { describe, it, expect } from 'vitest';
import { getChatErrorMessage } from './chatError';

describe('getChatErrorMessage', () => {
  it('maps missing API key errors', () => {
    expect(getChatErrorMessage(new Error('Please add your OpenAI API key first.'))).toContain(
      'Add your OpenAI API key'
    );
  });

  it('maps auth, rate limit, and network errors', () => {
    expect(getChatErrorMessage(new Error('Request failed with status 401'))).toContain('API key');
    expect(getChatErrorMessage(new Error('429 rate limit exceeded'))).toContain('rate-limiting');
    expect(getChatErrorMessage(new Error('Failed to fetch'))).toContain('Could not reach OpenAI');
  });

  it('includes the underlying error detail in the generic fallback', () => {
    const message = getChatErrorMessage(new Error('Request timed out after 45000 milliseconds'));
    expect(message).toContain('Something went wrong');
    expect(message).toContain('Request timed out after 45000 milliseconds');
  });

  it('handles non-Error values gracefully', () => {
    expect(getChatErrorMessage('boom')).toContain('Something went wrong');
    expect(getChatErrorMessage(undefined)).toContain('Something went wrong');
  });
});
