import { afterEach, describe, expect, it, vi } from 'vitest';
import { GUIDANCE_DOCUMENTS } from '../config/advisingConfig';
import {
  clearGuidanceDocumentCache,
  parseMarkdownSections,
  searchGuidance,
  selectRelevantSections,
} from './guidanceRetrieval';

describe('guidance retrieval', () => {
  afterEach(() => {
    clearGuidanceDocumentCache();
    vi.restoreAllMocks();
  });

  it('defines public PHIL and sanitized CLA guidance assets', () => {
    expect(GUIDANCE_DOCUMENTS.phil.path).toBe('PHIL_Advising_doc.md');
    expect(GUIDANCE_DOCUMENTS.cla.path).toBe('CLA_Faculty_Guidance_Fall_2026.md');
    expect(GUIDANCE_DOCUMENTS.cla.label).toContain('sanitized');
  });

  it('parses Markdown headings into searchable sections', () => {
    const sections = parseMarkdownSections(
      '# Guidance\n\nIntro\n\n## Office Hours\n\nSchedule weekly hours.\n\n## Final Examinations\n\nFollow the Registrar schedule.'
    );

    expect(sections).toEqual([
      { heading: 'Guidance', level: 1, content: 'Intro' },
      { heading: 'Office Hours', level: 2, content: 'Schedule weekly hours.' },
      { heading: 'Final Examinations', level: 2, content: 'Follow the Registrar schedule.' },
    ]);
  });

  it('ranks sections using query terms from headings and content', () => {
    const sections = parseMarkdownSections(
      '# Guidance\n\n## Office Hours\n\nSchedule weekly hours.\n\n## Final Examinations\n\nFollow the Registrar final exam schedule.'
    );

    const results = selectRelevantSections(sections, 'when is the final exam schedule?', 1);

    expect(results).toHaveLength(1);
    expect(results[0].heading).toBe('Final Examinations');
  });

  it('loads only the requested document and returns bounded labeled guidance', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => '# CLA Guidance\n\n## Add/Drop\n\nThe Fall 2026 add deadline is listed here.',
    } as Response);

    const result = await searchGuidance('cla', 'Fall 2026 add deadline');

    expect(fetchSpy).toHaveBeenCalledWith(
      'CLA_Faculty_Guidance_Fall_2026.md',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result).toContain('CLA Faculty Guidance (sanitized, Fall 2026)');
    expect(result).toContain('Add/Drop');
    expect(result).toContain('Fall 2026 add deadline');
  });
});
