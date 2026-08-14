import { afterEach, describe, expect, it, vi } from 'vitest';
import { ADVISING_CONFIG } from '../config/advisingConfig';
import { clearAdvisingDocumentCache, loadAdvisingDocument } from './advisingDocument';

describe('advising document loader', () => {
  afterEach(() => {
    clearAdvisingDocumentCache();
    vi.restoreAllMocks();
  });

  it('fetches the canonical reference as a relative public asset', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => 'latest reference',
    } as Response);

    await expect(loadAdvisingDocument()).resolves.toBe('latest reference');
    expect(fetchSpy).toHaveBeenCalledWith('PHIL_Advising_doc.md');
    expect(ADVISING_CONFIG.DOCUMENT_LABEL).toContain('Latest PHIL advising reference');
  });
});
