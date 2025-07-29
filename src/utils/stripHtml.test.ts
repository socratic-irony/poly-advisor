import { describe, it, expect } from 'vitest';
import { stripHtml } from './stripHtml';

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    const html = '<p>Hello <strong>World</strong></p>';
    expect(stripHtml(html)).toBe('Hello World');
  });

  it('returns original string when no tags present', () => {
    const text = 'Just text';
    expect(stripHtml(text)).toBe(text);
  });
});
