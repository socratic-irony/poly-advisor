import { Message } from '../types';

type ResponseRecord = Record<string, unknown>;

const asRecord = (value: unknown): ResponseRecord | null =>
  typeof value === 'object' && value !== null ? value as ResponseRecord : null;

export const extractUniqueSources = (annotations: unknown[]): Message['sources'] => {
  const sources: NonNullable<Message['sources']> = [];

  for (const annotation of annotations) {
    const record = asRecord(annotation);
    const url = record?.url;
    if (typeof url !== 'string' || sources.some((source) => source.url === url)) {
      continue;
    }

    sources.push({
      title: record && typeof record.title === 'string' ? record.title : url,
      url,
    });
  }

  return sources.length > 0 ? sources : undefined;
};

const collectTextAndAnnotations = (content: unknown): { text: string; annotations: unknown[] } => {
  const texts: string[] = [];
  const annotations: unknown[] = [];

  const visit = (node: unknown) => {
    if (typeof node === 'string') {
      const trimmed = node.trim();
      if (trimmed) {
        texts.push(trimmed);
      }
      return;
    }

    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    const record = asRecord(node);
    if (!record) {
      return;
    }

    if (typeof record.text === 'string') {
      const trimmed = record.text.trim();
      if (trimmed) {
        texts.push(trimmed);
      }
    }

    if (Array.isArray(record.annotations)) {
      annotations.push(...record.annotations);
    }

    if (record.content) {
      visit(record.content);
    }
  };

  visit(content);

  return { text: texts.join('\n').trim(), annotations };
};

export const extractResponseText = (response: unknown): { text: string; annotations: unknown[] } => {
  const record = asRecord(response);
  const outputs = Array.isArray(record?.output) ? record.output : [];

  for (const output of outputs) {
    const extracted = collectTextAndAnnotations(output);
    if (extracted.text) {
      return extracted;
    }
  }

  const outputText = collectTextAndAnnotations(record?.output_text);
  if (outputText.text) {
    return outputText;
  }

  return collectTextAndAnnotations(asRecord(record?.response)?.output_text);
};

export const filterUrlCitations = (annotations: unknown[]): unknown[] =>
  annotations.filter((annotation) => asRecord(annotation)?.type === 'url_citation');
