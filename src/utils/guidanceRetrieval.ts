import { GUIDANCE_DOCUMENTS, GuidanceDocumentId } from '../config/advisingConfig';

export type GuidanceDocumentRequest = GuidanceDocumentId | 'both';

export type MarkdownSection = {
  heading: string;
  level: number;
  content: string;
};

const MAX_SECTION_COUNT = 4;
const MAX_RESULT_LENGTH = 12000;

const documentCache = new Map<GuidanceDocumentId, string>();

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[`*_>#()[\]{}.,:;!?/\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const queryTerms = (query: string): string[] =>
  [...new Set(normalize(query).split(' ').filter((term) => term.length > 2))];

export function parseMarkdownSections(markdown: string): MarkdownSection[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const sections: MarkdownSection[] = [];
  let current: MarkdownSection | null = null;

  const flush = () => {
    if (!current) return;
    const content = current.content.trim();
    sections.push({ ...current, content });
  };

  for (const line of lines) {
    const headingMatch = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (headingMatch) {
      flush();
      current = {
        heading: headingMatch[2].trim(),
        level: headingMatch[1].length,
        content: '',
      };
      continue;
    }

    if (current) {
      current.content += `${line}\n`;
    }
  }

  flush();
  return sections;
}

const scoreSection = (section: MarkdownSection, terms: string[]): number => {
  if (terms.length === 0) return 0;

  const heading = normalize(section.heading);
  const content = normalize(section.content);
  return terms.reduce((score, term) => {
    const headingMatches = heading.split(' ').filter((word) => word.includes(term)).length;
    const contentMatches = content.split(' ').filter((word) => word.includes(term)).length;
    return score + headingMatches * 5 + Math.min(contentMatches, 5);
  }, 0);
};

export function selectRelevantSections(
  sections: MarkdownSection[],
  query: string,
  limit = MAX_SECTION_COUNT,
): MarkdownSection[] {
  if (sections.length === 0 || limit <= 0) return [];

  const terms = queryTerms(query);
  const scored = sections
    .map((section, index) => ({ section, index, score: scoreSection(section, terms) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit);

  if (scored.length > 0) {
    return scored.map(({ section }) => section);
  }

  return sections.slice(0, limit);
}

async function loadDocument(documentId: GuidanceDocumentId): Promise<string> {
  const cached = documentCache.get(documentId);
  if (cached !== undefined) return cached;

  const response = await fetch(GUIDANCE_DOCUMENTS[documentId].path);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${documentId} guidance: ${response.status}`);
  }

  const content = await response.text();
  documentCache.set(documentId, content);
  return content;
}

const formatDocumentResult = (
  documentId: GuidanceDocumentId,
  sections: MarkdownSection[],
): string => {
  const document = GUIDANCE_DOCUMENTS[documentId];
  const body = sections
    .map((section) => `## ${section.heading}\n\n${section.content}`)
    .join('\n\n')
    .trim();

  return `=== ${document.label} ===\n${document.description}\n\n${body}`;
};

export async function searchGuidance(
  documentRequest: GuidanceDocumentRequest,
  query: string,
): Promise<string> {
  const documentIds: GuidanceDocumentId[] = documentRequest === 'both'
    ? ['phil', 'cla']
    : [documentRequest];

  const results = await Promise.all(documentIds.map(async (documentId) => {
    const content = await loadDocument(documentId);
    const sections = selectRelevantSections(parseMarkdownSections(content), query);
    return formatDocumentResult(documentId, sections);
  }));

  const output = results.join('\n\n');
  return output.length > MAX_RESULT_LENGTH
    ? `${output.slice(0, MAX_RESULT_LENGTH)}\n\n[Additional guidance omitted for brevity.]`
    : output;
}

export function clearGuidanceDocumentCache(): void {
  documentCache.clear();
}
