// OpenAI web search can emit private-use citation markers inline,
// e.g. \ue200cite\ue202turn0search0\ue201 (several ids may share one marker).
const MARKER_SOURCE = '\ue200[^\ue201]*\ue201';
const STRAY = /[\ue200-\ue206]/g;
const SEP = '\ue202';
// A parenthetical holding exactly one markdown link, e.g. " ([cla.calpoly.edu](https://cla.calpoly.edu/x))".
const PAREN_LINK = / ?\(\[[^\]]*\]\((https?:\/\/[^)\s]+)\)\)/g;

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
        ? `\ue200cite${SEP}${marker.urls.map(encodeURIComponent).join(SEP)}\ue201`
        : text.slice(marker.start, marker.end);
    cursor = marker.end;
  }
  return result + text.slice(cursor);
};

export const stripCitationMarkers = (text: string): string =>
  // Also swallow the spaces before a marker so removal never leaves a double space or a space before punctuation.
  text
    .replace(PAREN_LINK, '')
    .replace(new RegExp(`[ \\t]*${MARKER_SOURCE}`, 'g'), '')
    .replace(STRAY, '');

// Swaps each marker and each "([label](url))" parenthetical for <citemark> tags, numbered by the
// source's position in `sources` (matching the Sources list). Links not in `sources` are numbered
// after the listed ones; markers that could not be resolved become an unlinked "•" badge.
export const markCitations = (text: string, sources: { url: string }[] = []): string => {
  const extras = new Map<string, number>();
  const numberFor = (url: string): number => {
    const position = sources.findIndex((source) => source.url === url);
    if (position >= 0) return position + 1;
    if (!extras.has(url)) extras.set(url, sources.length + extras.size + 1);
    return extras.get(url) as number;
  };
  const tag = (url: string): string =>
    `<citemark n="${numberFor(url)}" u="${encodeURIComponent(url)}"></citemark>`;

  return text
    .replace(PAREN_LINK, (_match, url: string) => tag(url))
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
      return urls.length > 0 ? urls.map(tag).join('') : '<citemark n="•"></citemark>';
    })
    .replace(STRAY, '');
};
