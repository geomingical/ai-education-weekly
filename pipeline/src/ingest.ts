// Feed items -> validated story records.
//
// This is the gate between untrusted feed content and the published site.
// Because publishing is automatic, everything rejected here is something a
// reader will never see, and everything accepted goes live unread. The rules
// are therefore deliberately strict and deliberately boring.

import { createHash } from 'node:crypto';
import type { RawFeedItem } from './contracts';
import { isEducationRelevant, resolveTopics, type Topic } from './classify';

export interface IngestSource {
  id: string;
  officialDomains: readonly string[];
  relevanceMode: 'always' | 'keyword';
  defaultTopics: readonly Topic[];
  maxPerRun: number;
  region: string;
  language: 'en' | 'zh-tw' | 'zh-cn' | 'other';
}

export interface IngestedItem {
  id: string;
  sourceId: string;
  title: string;
  summaryOriginal: string;
  url: string;
  publishedAt: string;
  topics: Topic[];
  region: string;
  language: IngestSource['language'];
}

export const REJECT_REASONS = [
  'no-title',
  'bad-url',
  'off-domain',
  'no-date',
  'future-dated',
  'outside-window',
  'not-relevant',
  'duplicate',
  'over-cap',
] as const;

export type RejectReason = (typeof REJECT_REASONS)[number];

export type RejectCounts = Partial<Record<RejectReason, number>>;

export interface IngestResult {
  accepted: IngestedItem[];
  rejected: { reason: RejectReason; title: string }[];
  /** Reason histogram, so a source that suddenly contributes nothing shows
   *  WHY in the run report instead of just showing a zero. */
  rejectCounts: RejectCounts;
}

/** Stable per-article id: the same URL always yields the same record. */
export function storyId(url: string): string {
  return createHash('sha256').update(canonicalUrl(url)).digest('hex').slice(0, 16);
}

// Tracking parameters make the same article look like several different ones
// across feeds and across weeks. Stripping them is what makes the id stable
// and de-duplication actually work.
const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_id', 'utm_name', 'fbclid', 'gclid', 'mc_cid', 'mc_eid', 'ref', 'source',
];

export function canonicalUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return rawUrl.trim();
  }
  for (const param of TRACKING_PARAMS) parsed.searchParams.delete(param);
  parsed.hash = '';
  parsed.hostname = parsed.hostname.toLowerCase();
  // A trailing slash is not a different article.
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }
  return parsed.toString();
}

function hostAllowed(rawUrl: string, allowedDomains: readonly string[]): boolean {
  let hostname: string;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    hostname = parsed.hostname.toLowerCase();
  } catch {
    return false;
  }
  return allowedDomains.some(
    (domain) => hostname === domain.toLowerCase() || hostname.endsWith(`.${domain.toLowerCase()}`),
  );
}

export interface IngestWindow {
  /** Inclusive lower bound: items published before this are outside the run. */
  start: Date;
  /** Exclusive upper bound, normally "now". */
  end: Date;
}

// A feed may legitimately be a few hours ahead of the runner's clock. Anything
// beyond this is a data error, not a timezone: the research pass found one
// outlet shipping items dated weeks into the future, and an automatic
// publisher must not let that create an issue for a week that has not happened.
const FUTURE_TOLERANCE_MS = 6 * 60 * 60 * 1000;

export function ingestSourceItems(
  source: IngestSource,
  items: readonly RawFeedItem[],
  window: IngestWindow,
  seenIds: Set<string>,
): IngestResult {
  const accepted: IngestedItem[] = [];
  const rejected: IngestResult['rejected'] = [];
  const rejectCounts: RejectCounts = {};

  const reject = (reason: RejectReason, title: string) => {
    rejected.push({ reason, title: title.slice(0, 120) });
    rejectCounts[reason] = (rejectCounts[reason] ?? 0) + 1;
  };

  // The cap keeps the newest items, so sort before deciding what fits. Items
  // without a usable date sort last and are rejected on the date check anyway.
  const ordered = [...items].sort((left, right) => {
    const leftTime = left.publishedAt ? Date.parse(left.publishedAt) : 0;
    const rightTime = right.publishedAt ? Date.parse(right.publishedAt) : 0;
    return rightTime - leftTime;
  });

  for (const item of ordered) {
    const title = item.title.trim();
    if (title.length === 0) {
      reject('no-title', '(untitled)');
      continue;
    }

    const url = item.link.trim();
    if (!url.startsWith('https://')) {
      reject('bad-url', title);
      continue;
    }
    if (!hostAllowed(url, source.officialDomains)) {
      // A feed on an allowlisted host can still link anywhere. Rejecting
      // off-domain links is what stops a compromised or syndicating feed from
      // publishing a link to a site nobody vetted.
      reject('off-domain', title);
      continue;
    }

    if (item.publishedAt === null) {
      reject('no-date', title);
      continue;
    }
    const published = new Date(item.publishedAt);
    if (Number.isNaN(published.getTime())) {
      reject('no-date', title);
      continue;
    }
    if (published.getTime() > window.end.getTime() + FUTURE_TOLERANCE_MS) {
      reject('future-dated', title);
      continue;
    }
    if (published.getTime() < window.start.getTime()) {
      reject('outside-window', title);
      continue;
    }

    if (source.relevanceMode === 'keyword' && !isEducationRelevant(item)) {
      reject('not-relevant', title);
      continue;
    }

    const id = storyId(url);
    if (seenIds.has(id)) {
      reject('duplicate', title);
      continue;
    }
    if (accepted.length >= source.maxPerRun) {
      // Everything from here on is older than what already fits, because the
      // list was sorted newest-first above.
      reject('over-cap', title);
      continue;
    }

    seenIds.add(id);

    accepted.push({
      id,
      sourceId: source.id,
      title,
      summaryOriginal: item.summary.trim(),
      url: canonicalUrl(url),
      publishedAt: published.toISOString(),
      topics: resolveTopics(item, source.defaultTopics),
      region: source.region,
      language: source.language,
    });
  }

  return { accepted, rejected, rejectCounts };
}
