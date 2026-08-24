/**
 * Configuration for the advising document integration
 */
export const ADVISING_CONFIG = {
  // Canonical reference is a Markdown extraction of the latest supplied PHIL.docx.
  ADVISING_DOC_PATH: 'PHIL_Advising_doc.md',
  DOCUMENT_LABEL: 'Latest PHIL advising reference (PHIL.docx)',
} as const;

export type GuidanceDocumentId = 'phil' | 'cla';

export const GUIDANCE_DOCUMENTS: Record<GuidanceDocumentId, {
  path: string;
  label: string;
  description: string;
}> = {
  phil: {
    path: ADVISING_CONFIG.ADVISING_DOC_PATH,
    label: 'PHIL advising reference',
    description: 'Philosophy-major and department advising guidance.',
  },
  cla: {
    path: 'CLA_Faculty_Guidance_Fall_2026.md',
    label: 'CLA Faculty Guidance (sanitized, Fall 2026)',
    description: 'Public-safe CLA faculty operations and student advising guidance.',
  },
};
