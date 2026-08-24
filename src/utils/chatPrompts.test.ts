import { describe, expect, it } from 'vitest';
import { createSystemPrompt } from './chatPrompts';

describe('createSystemPrompt', () => {
  it('routes relevant faculty and student questions through guidance retrieval', () => {
    const prompt = createSystemPrompt('medium', false);

    expect(prompt).toContain('search_advising_guidance');
    expect(prompt).toContain('faculty member and major advisor');
    expect(prompt).toContain('faculty operations and student-facing advising');
    expect(prompt).toContain('For relevant PHIL or CLA questions, use the search_advising_guidance tool');
    expect(prompt).toContain('Still perform the web search for current Cal Poly policies, dates, catalogs, and changes.');
    expect(prompt).toContain('sanitized');
  });
});
