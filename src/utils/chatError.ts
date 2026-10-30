export function getChatErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';

  if (message.includes('Please add your OpenAI API key first.')) {
    return 'Add your OpenAI API key in Settings, then try again.';
  }

  if (/\b401\b|invalid api key|incorrect api key/i.test(message)) {
    return 'Your OpenAI API key was not accepted. Check it in Settings and try again.';
  }

  if (/\b429\b|rate limit/i.test(message)) {
    return 'OpenAI is temporarily rate-limiting requests. Wait a moment, then try again.';
  }

  if (/failed to fetch|network/i.test(message)) {
    return 'Could not reach OpenAI. Check your internet connection, then try again.';
  }

  const detail = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const hint = detail ? ` (${detail})` : '';
  return `Something went wrong while preparing that response. Please try again.${hint}`;
}

// Explains why a Responses API result contained no answer text, so the user sees a cause instead of a blank reply.
export function describeEmptyResponse(response: unknown): string {
  const r = (response ?? {}) as Record<string, any>;
  const output: any[] = Array.isArray(r.output) ? r.output : [];
  const outputTokens = r.usage?.output_tokens;
  const reasoningTokens = r.usage?.output_tokens_details?.reasoning_tokens;
  const tokenNote =
    typeof outputTokens === 'number'
      ? ` (${outputTokens} output tokens${typeof reasoningTokens === 'number' ? `, ${reasoningTokens} of them reasoning` : ''})`
      : '';

  if (r.status === 'failed') {
    return `OpenAI reported the response failed: ${r.error?.message ?? r.error?.code ?? 'no reason given'}.`;
  }
  if (r.status === 'incomplete') {
    const reason = r.incomplete_details?.reason;
    if (reason === 'max_output_tokens') {
      return `The model hit its output token limit before writing an answer${tokenNote}. Try again.`;
    }
    if (reason === 'content_filter') {
      return 'OpenAI\'s content filter stopped the response before an answer was written.';
    }
    return `The response ended early (${reason ?? 'unknown reason'}) before an answer was written${tokenNote}.`;
  }

  const refusal = output
    .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    .find((part: any) => part?.type === 'refusal');
  if (refusal) {
    return `The model declined to answer: ${refusal.refusal ?? 'no reason given'}.`;
  }

  if (output.some((item) => item?.type === 'function_call')) {
    return 'The model kept requesting guidance lookups instead of answering. Try again or rephrase.';
  }

  const types = output.map((item) => item?.type).filter(Boolean).join(', ') || 'nothing';
  return `The model finished without writing an answer${tokenNote}. It returned: ${types}.`;
}
