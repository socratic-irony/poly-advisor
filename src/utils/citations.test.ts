import { describe, expect, it } from 'vitest';
import { markCitations, resolveCitationMarkers, stripCitationMarkers } from './citations';

const a = 'citeturn0search0';
const b = 'citeturn0search1';

describe('citation markers', () => {
  it('strips markers for copy/export', () => {
    expect(stripCitationMarkers(`Use the form.${a} Done ${b}.`)).toBe('Use the form. Done.');
    expect(stripCitationMarkers(`Submit the form ${a} before ${b} the deadline.`)).toBe(
      'Submit the form before the deadline.'
    );
    expect(stripCitationMarkers(`Submit the form${a} before the deadline.`)).toBe('Submit the form before the deadline.');
  });

  it('numbers resolved markers by their position in the sources list and keeps unresolved ones as bullets', () => {
    const text = `x${a} y${b}`;
    const annotations = [{ type: 'url_citation', url: 'https://calpoly.edu/b', start_index: 0, end_index: 0 }];
    const resolved = resolveCitationMarkers(text, [
      { type: 'url_citation', url: 'https://calpoly.edu/a', start_index: 1, end_index: 1 + a.length },
      ...annotations,
    ]);
    const sources = [{ url: 'https://calpoly.edu/b' }, { url: 'https://calpoly.edu/a' }];
    const marked = markCitations(resolved, sources);
    expect(marked).toContain('n="2" u="https%3A%2F%2Fcalpoly.edu%2Fa"');
    expect(marked).toContain('n="•"');
  });
});
