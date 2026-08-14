import { describe, expect, it } from 'vitest';
import { createSystemPrompt } from './chatPrompts';

describe('createSystemPrompt', () => {
  it('requires PHIL questions to use the advising document alongside current web guidance', () => {
    const prompt = createSystemPrompt('medium', '\nDOC CONTENT', false);

    expect(prompt).toContain('For any PHIL/Philosophy-major or department-specific question, read and use it before answering.');
    expect(prompt).toContain('Still perform the web search for current Cal Poly policies, dates, catalogs, and changes.');
    expect(prompt).toContain('DOC CONTENT');
  });
});
