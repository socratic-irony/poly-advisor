// OpenAI web search can emit private-use citation markers inline,
// e.g. citeturn0search0 (several ids may share one marker).
const MARKER_SOURCE = '[^]*';
const STRAY = /[-]/g;
const SEP = '';

type CitationAnnotation = { url: string; start: number; end: number };

const readCitationAnnotations = (annotations: unknown[]): CitationAnnotation[] =>
  annotations.flatMap((annotation) => {
    const a = annotation as Record<string, unknown> | null;
    if (
      a?.type === 'url_citation' &&
      typeof a.url === 'string' &&
      typeof a.start_index === 'number' &&
      typeof a.end_index === 'number'
    ) {
      return [{ url: a.url, start: a.start_index, end: a.end_index }];
    }
    return [];
  });

// Rewrites each marker so it carries the URLs of the url_citation annotations that point at it
// (overlapping the marker, else the first marker at/after the annotation start).
export const resolveCitationMarkers = (text: string, annotations: unknown[]): string => {
  const citations = readCitationAnnotations(annotations);
  if (citations.length === 0) return text;

  const markers = [...text.matchAll(new RegExp(MARKER_SOURCE, 'g'))].map((m) => ({
    start: m.index ?? 0,
    end: (m.index ?? 0) + m[0].length,
    urls: [] as string[],
  }));

  for (const citation of citations) {
    const target =
      markers.find((m) => m.start < citation.end && m.end > citation.start) ??
      markers.find((m) => m.start >= citation.start);
    if (target && !target.urls.includes(citation.url)) target.urls.push(citation.url);
  }

  let result = '';
  let cursor = 0;
  for (const marker of markers) {
    result += text.slice(cursor, marker.start);
    result +=
      marker.urls.length > 0
        ? `cite${SEP}${marker.urls.map(encodeURIComponent).join(SEP)}`
        : text.slice(marker.start, marker.end);
    cursor = marker.end;
  }
  return result + text.slice(cursor);
};

export const stripCitationMarkers = (text: string): string =>
  // Also swallow the spaces before a marker so removal never leaves a double space or a space before punctuation.
  text.replace(new RegExp(`[ \\t]*${MARKER_SOURCE}`, 'g'), '').replace(STRAY, '');

// Swaps each marker for <citemark> tags: one per resolved source, numbered by its position in `sources`
// (matching the Sources list); markers that could not be resolved become an unlinked "•" badge.
export const markCitations = (text: string, sources: { url: string }[] = []): string =>
  text
    .replace(new RegExp(MARKER_SOURCE, 'g'), (marker) => {
      const urls = marker
        .slice(1, -1)
        .split(SEP)
        .slice(1)
        .map((part) => {
          try {
            return decodeURIComponent(part);
          } catch {
            return '';
          }
        })
        .filter((part) => /^https?:\/\//.test(part));
      const tags = urls.flatMap((url) => {
        const position = sources.findIndex((source) => source.url === url);
        return position >= 0
          ? [`<citemark n="${position + 1}" u="${encodeURIComponent(url)}"></citemark>`]
          : [];
      });
      return tags.length > 0 ? tags.join('') : '<citemark n="•"></citemark>';
    })
    .replace(STRAY, '');
