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
