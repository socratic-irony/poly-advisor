import { GuidanceDocumentRequest, searchGuidance } from './guidanceRetrieval';

const GUIDANCE_DOCUMENT_CHOICES = ['phil', 'cla', 'both'] as const;

export const guidanceSearchTool = {
  type: 'function',
  name: 'search_advising_guidance',
  description:
    'Search the bundled public-safe PHIL and CLA advising references for relevant faculty operations or student-facing advising guidance. Use this for department requirements, course planning, substitutions, permission numbers, office hours, enrollment, add/drop, withdrawals, course modality, final exams, grading, advising, and related processes. Choose both when the topic may span PHIL and CLA guidance.',
  parameters: {
    type: 'object',
    properties: {
      document: {
        type: 'string',
        enum: GUIDANCE_DOCUMENT_CHOICES,
        description: 'Which bundled reference to search.',
      },
      query: {
        type: 'string',
        description: 'The focused question or topic to search for in the reference.',
      },
    },
    required: ['document', 'query'],
    additionalProperties: false,
  },
  strict: true,
} as const;

type GuidanceToolArguments = {
  document: GuidanceDocumentRequest;
  query: string;
};

export async function executeGuidanceToolCall(argumentsJson: string): Promise<string> {
  try {
    const parsed = JSON.parse(argumentsJson) as Partial<GuidanceToolArguments>;
    if (!GUIDANCE_DOCUMENT_CHOICES.includes(parsed.document as typeof GUIDANCE_DOCUMENT_CHOICES[number])) {
      return 'Unable to search guidance: choose document phil, cla, or both.';
    }

    if (typeof parsed.query !== 'string' || !parsed.query.trim()) {
      return 'Unable to search guidance: provide a non-empty query.';
    }

    return await searchGuidance(parsed.document as GuidanceDocumentRequest, parsed.query);
  } catch (error) {
    console.error('Unable to execute guidance search', error);
    return 'Unable to search bundled guidance. Use current official Cal Poly web sources instead.';
  }
}
