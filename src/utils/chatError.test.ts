import { describe, it, expect } from 'vitest';
import { getChatErrorMessage, describeEmptyResponse } from './chatError';

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

describe('describeEmptyResponse', () => {
  it('reports the output token limit with reasoning usage', () => {
    const text = describeEmptyResponse({
      status: 'incomplete',
      incomplete_details: { reason: 'max_output_tokens' },
      usage: { output_tokens: 4000, output_tokens_details: { reasoning_tokens: 4000 } },
    });
    expect(text).toContain('output token limit');
    expect(text).toContain('4000 of them reasoning');
  });

  it('reports refusals, failures and pending tool calls', () => {
    expect(describeEmptyResponse({ output: [{ content: [{ type: 'refusal', refusal: 'No.' }] }] })).toContain('declined');
    expect(describeEmptyResponse({ status: 'failed', error: { message: 'boom' } })).toContain('boom');
    expect(describeEmptyResponse({ output: [{ type: 'function_call' }] })).toContain('guidance lookups');
  });

  it('falls back to listing what came back', () => {
    expect(describeEmptyResponse({ output: [{ type: 'reasoning' }] })).toContain('reasoning');
  });
});
