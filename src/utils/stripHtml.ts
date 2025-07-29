export function stripHtml(input: string): string {
  if (!/<[a-z][\s\S]*>/i.test(input)) {
    return input;
  }
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(input, 'text/html');
      return doc.body.textContent?.trim() || '';
    } catch {
      // fall through to regex
    }
  }
  return input.replace(/<[^>]+>/g, '');
}
