import { parseHTML } from 'linkedom';
import { MAX_ARTICLE_CHARS } from './article';
import type { RawFeedItem } from './contracts';
import { toPlainText, truncateSummary } from './feed-parser';
import type { IngestedItem } from './ingest';

export interface ArxivListResult {
  items: RawFeedItem[];
  expectedItems: number | null;
  parsedItems: number;
  truncatedReason: string | null;
  error: string | null;
}

const MONTHS = new Map([
  ['Jan', 0], ['Feb', 1], ['Mar', 2], ['Apr', 3], ['May', 4], ['Jun', 5],
  ['Jul', 6], ['Aug', 7], ['Sep', 8], ['Oct', 9], ['Nov', 10], ['Dec', 11],
]);

const ARXIV_ID = /^(?:\d{4}\.\d{4,5}|[a-z][a-z0-9.-]*\/\d{7})(?:v\d+)?$/i;

function announcementDate(text: string): string | null {
  const match = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+(\d{1,2})\s+([A-Z][a-z]{2})\s+(\d{4})\b/.exec(
    text.trim(),
  );
  if (!match) return null;
  const day = Number(match[1]);
  const month = MONTHS.get(match[2] ?? '');
  const year = Number(match[3]);
  if (month === undefined || !Number.isInteger(day) || !Number.isInteger(year)) return null;
  const date = new Date(Date.UTC(year, month, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) return null;
  return date.toISOString();
}

function textWithoutDescriptor(element: Element | null): string {
  if (!element) return '';
  const clone = element.cloneNode(true) as Element;
  clone.querySelector('.descriptor')?.remove();
  return toPlainText(clone.textContent ?? '');
}

export function validateArxivListFinalUrl(rawUrl: string, category: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return 'final URL is invalid';
  }
  if (url.protocol !== 'https:' || url.hostname !== 'arxiv.org') {
    return 'final URL left https://arxiv.org';
  }
  if (url.pathname !== `/list/${category}/pastweek`) {
    return `final URL path is not /list/${category}/pastweek`;
  }
  const entries = [...url.searchParams.entries()];
  if (entries.length !== 1 || entries[0]?.[0] !== 'show' || entries[0]?.[1] !== '2000') {
    return 'final URL query must be exactly show=2000';
  }
  return null;
}

export function validateArxivAbstractUrl(rawUrl: string, expectedUrl: string): string | null {
  let url: URL;
  let expected: URL;
  try {
    url = new URL(rawUrl);
    expected = new URL(expectedUrl);
  } catch {
    return 'abstract URL is invalid';
  }
  if (url.protocol !== 'https:' || url.hostname !== 'arxiv.org') {
    return 'abstract URL left https://arxiv.org';
  }
  if (
    expected.protocol !== 'https:' ||
    expected.hostname !== 'arxiv.org' ||
    !expected.pathname.startsWith('/abs/') ||
    expected.search !== ''
  ) {
    return 'expected abstract URL is not canonical';
  }
  if (url.pathname !== expected.pathname || url.search !== '') {
    return `abstract URL is not ${expected.pathname}`;
  }
  return null;
}

export function parseArxivList(html: string, _category: string): ArxivListResult {
  const { document } = parseHTML(html);
  const articleGroups = [...document.querySelectorAll('#articles')];
  const countText = document.querySelector('.paging')?.textContent ?? '';
  const countMatch = /Total of\s+([\d,]+)\s+entr(?:y|ies)/i.exec(countText);
  const expectedItems = countMatch ? Number((countMatch[1] ?? '').replaceAll(',', '')) : null;

  if (articleGroups.length === 0) {
    return {
      items: [], expectedItems, parsedItems: 0, truncatedReason: null,
      error: 'arXiv list has no article container',
    };
  }
  if (expectedItems === null || !Number.isSafeInteger(expectedItems) || expectedItems < 0) {
    return {
      items: [], expectedItems: null, parsedItems: 0, truncatedReason: null,
      error: 'arXiv list has no valid declared entry count',
    };
  }

  const items: RawFeedItem[] = [];
  for (const articles of articleGroups) {
    let currentDate: string | null = null;
    for (const child of [...articles.children]) {
      if (child.tagName.toLowerCase() === 'h3') {
        currentDate = announcementDate(child.textContent ?? '');
        continue;
      }
      if (child.tagName.toLowerCase() !== 'dt' || currentDate === null) continue;

      const abstractLink = child.querySelector('a[title="Abstract"]');
      const href = abstractLink?.getAttribute('href')?.trim() ?? '';
      const id = href.startsWith('/abs/') ? href.slice('/abs/'.length).replace(/\/$/, '') : '';
      const details = child.nextElementSibling;
      if (!ARXIV_ID.test(id) || details?.tagName.toLowerCase() !== 'dd') continue;

      const title = textWithoutDescriptor(details.querySelector('.list-title'));
      if (!title) continue;
      const comments = textWithoutDescriptor(details.querySelector('.list-comments'));
      const subjects = textWithoutDescriptor(details.querySelector('.list-subjects'));
      const summary = [comments, subjects].filter(Boolean).join(' · ');
      items.push({
        title,
        link: `https://arxiv.org/abs/${id}`,
        summary: truncateSummary(summary),
        fullText: '',
        publishedAt: currentDate,
        guid: id,
      });
    }
  }

  if (expectedItems > 0 && items.length === 0) {
    return {
      items: [], expectedItems, parsedItems: 0, truncatedReason: null,
      error: 'arXiv list declared entries but yielded no usable items',
    };
  }

  const reasons: string[] = [];
  if (items.length !== expectedItems) reasons.push('count-mismatch');
  if (expectedItems > 2000) reasons.push('over-bound');
  return {
    items,
    expectedItems,
    parsedItems: items.length,
    truncatedReason: reasons.length > 0 ? reasons.join(',') : null,
    error: null,
  };
}

export function parseArxivAbstract(
  html: string,
): { summary: string; fullText: string } | null {
  const { document } = parseHTML(html);
  const abstract = document.querySelector('.abstract.mathjax');
  const text = textWithoutDescriptor(abstract).trim();
  if (!text) return null;
  return {
    summary: truncateSummary(text),
    fullText: text.slice(0, MAX_ARTICLE_CHARS),
  };
}

export interface ArxivEnrichmentResult {
  accepted: IngestedItem[];
  attempts: number;
  failed: number;
  duplicates: number;
  overCap: number;
  skipped: number;
  exhausted: boolean;
}

export async function enrichArxivItems(
  relevant: readonly IngestedItem[],
  runCap: number,
  seenIds: Set<string>,
  fetchAbstract: (
    item: IngestedItem,
  ) => Promise<{ summary: string; fullText: string } | null>,
): Promise<ArxivEnrichmentResult> {
  const accepted: IngestedItem[] = [];
  const attemptLimit = runCap + 4;
  let attempts = 0;
  let failed = 0;
  let duplicates = 0;
  let overCap = 0;
  let skipped = 0;

  for (const item of relevant) {
    if (seenIds.has(item.id)) {
      duplicates += 1;
      continue;
    }
    if (accepted.length >= runCap) {
      overCap += 1;
      continue;
    }
    if (attempts >= attemptLimit) {
      skipped += 1;
      continue;
    }
    attempts += 1;
    const abstract = await fetchAbstract(item);
    if (abstract === null) {
      failed += 1;
      continue;
    }
    accepted.push({
      ...item,
      summaryOriginal: abstract.summary,
      fullText: abstract.fullText,
    });
    seenIds.add(item.id);
  }

  const exhausted = accepted.length < runCap && attempts >= attemptLimit && skipped > 0;
  return {
    accepted,
    attempts,
    failed,
    duplicates,
    overCap,
    skipped,
    exhausted,
  };
}
