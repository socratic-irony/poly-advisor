import { describe, expect, it } from 'vitest';
import { markCitations, resolveCitationMarkers, stripCitationMarkers } from './citations';

const a = '\ue200cite\ue202turn0search0\ue201';
const b = '\ue200cite\ue202turn0search1\ue201';

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

  describe('parenthetical link citations', () => {
    const sources = [{ url: 'https://cla.calpoly.edu/a' }, { url: 'https://philosophy.calpoly.edu/b' }];

    it('turns ([label](url)) into a chip numbered by its source position', () => {
      const text = 'Do this. ([philosophy.calpoly.edu](https://philosophy.calpoly.edu/b)) Then that.';
      expect(markCitations(text, sources)).toBe(
        `Do this.<citemark n="2" u="${encodeURIComponent('https://philosophy.calpoly.edu/b')}"></citemark> Then that.`
      );
    });

    it('numbers links that are not in the sources list after the listed sources', () => {
      const text = 'A ([x](https://other.calpoly.edu/1)) B ([y](https://other.calpoly.edu/2)) C ([x](https://other.calpoly.edu/1))';
      const marked = markCitations(text, sources);
      expect(marked).toContain('n="3"');
      expect(marked).toContain('n="4"');
      expect(marked.match(/n="3"/g)).toHaveLength(2);
    });

    it('leaves ordinary links and multi-link parentheses alone', () => {
      const text = 'See [the form](https://cla.calpoly.edu/a) or ([a](https://x.edu/1), [b](https://x.edu/2)).';
      expect(markCitations(text, sources)).toBe(text);
    });

    it('removes them for copy/export', () => {
      expect(
        stripCitationMarkers('option. ([cla.calpoly.edu](https://cla.calpoly.edu/a)) Next.')
      ).toBe('option. Next.');
      expect(stripCitationMarkers('See [the form](https://cla.calpoly.edu/a).')).toBe('See [the form](https://cla.calpoly.edu/a).');
    });
  });
});
