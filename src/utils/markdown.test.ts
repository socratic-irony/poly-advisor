import { describe, expect, it } from 'vitest';
import { cleanMarkdown } from './markdown';

describe('cleanMarkdown', () => {
  it('preserves line breaks between Markdown table rows', () => {
    const table = '| Percentage | Grade |\n| --- | --- |\n| 93–100% | A |';

    expect(cleanMarkdown(table)).toBe(table);
  });

  it('collapses runs of blank lines down to a single paragraph break', () => {
    expect(cleanMarkdown('First paragraph.\n\n\n\nSecond paragraph.')).toBe(
      'First paragraph.\n\nSecond paragraph.'
    );
  });
});
