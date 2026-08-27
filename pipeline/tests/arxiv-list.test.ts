import { describe, expect, it } from 'vitest';
import {
  enrichArxivItems,
  parseArxivAbstract,
  parseArxivList,
  validateArxivListFinalUrl,
} from '../src/arxiv-list';
import type { IngestedItem } from '../src/ingest';

function listing(
  groups: string,
  total = 2,
): string {
  return `<!doctype html><html><body>
    <div class="paging">Total of ${total} entries</div>
    <dl id="articles">${groups}</dl>
  </body></html>`;
}

function group(date: string, entries: string): string {
  return `<h3>${date} (showing entries)</h3>${entries}`;
}

function entry(id: string, title: string): string {
  return `<dt><a href="/abs/${id}" title="Abstract" id="${id}">arXiv:${id}</a></dt>
    <dd><div class="meta">
      <div class="list-title"><span class="descriptor">Title:</span> ${title}</div>
      <div class="list-comments"><span class="descriptor">Comments:</span> 12 pages</div>
      <div class="list-subjects"><span class="descriptor">Subjects:</span> Computers and Society (cs.CY)</div>
    </div></dd>`;
}

describe('parseArxivList', () => {
  it('parses every date group with a stable midnight-UTC announcement date', () => {
    const html = listing(
      group('Wed, 26 Aug 2026', entry('2608.24778', 'AI Education')) +
        group('Tue, 25 Aug 2026', entry('2608.24001', 'Teacher Tools')),
    );
    const result = parseArxivList(html, 'cs.CY');

    expect(result.items.map((item) => [item.guid, item.publishedAt])).toEqual([
      ['2608.24778', '2026-08-26T00:00:00.000Z'],
      ['2608.24001', '2026-08-25T00:00:00.000Z'],
    ]);
    expect(result.items[0]?.summary).toContain('12 pages');
    expect(result.expectedItems).toBe(2);
    expect(result.parsedItems).toBe(2);
    expect(result.truncatedReason).toBeNull();
    expect(result.error).toBeNull();
  });

  it('combines the repeated article containers used for each real date group', () => {
    const html = `<!doctype html><html><body>
      <div class="paging">Total of 2 entries</div>
      <dl id="articles">${group('Wed, 26 Aug 2026', entry('2608.24778', 'First'))}</dl>
      <dl id="articles">${group('Tue, 25 Aug 2026', entry('2608.24001', 'Second'))}</dl>
    </body></html>`;
    const result = parseArxivList(html, 'cs.CY');
    expect(result.parsedItems).toBe(2);
    expect(result.items.map((item) => item.guid)).toEqual(['2608.24778', '2608.24001']);
    expect(result.truncatedReason).toBeNull();
  });

  it('accepts a declared empty list only when the article container exists', () => {
    expect(parseArxivList(listing('', 0), 'cs.CY')).toMatchObject({
      items: [], expectedItems: 0, parsedItems: 0, error: null, truncatedReason: null,
    });
    expect(parseArxivList('<div class="paging">Total of 0 entries</div>', 'cs.CY').error)
      .toMatch(/article container/i);
  });

  it('fails when a positive declared total yields no usable entries', () => {
    expect(parseArxivList(listing('', 2), 'cs.CY').error).toMatch(/no usable/i);
  });

  it('marks usable count mismatches and over-bound totals partial', () => {
    const mismatch = parseArxivList(
      listing(group('Wed, 26 Aug 2026', entry('2608.24778', 'One')), 2),
      'cs.CY',
    );
    expect(mismatch.error).toBeNull();
    expect(mismatch.truncatedReason).toMatch(/count-mismatch/);

    const overBound = parseArxivList(
      listing(group('Wed, 26 Aug 2026', entry('2608.24778', 'One')), 2001),
      'cs.CY',
    );
    expect(overBound.truncatedReason).toMatch(/over-bound/);
  });

  it.each([
    ['a malformed date', group('not a date', entry('2608.24778', 'One'))],
    ['a malformed id', group('Wed, 26 Aug 2026', entry('not-an-id', 'One'))],
  ])('marks %s partial when another entry remains usable', (_label, broken) => {
    const html = listing(
      broken + group('Tue, 25 Aug 2026', entry('2608.24001', 'Usable')),
      2,
    );
    const result = parseArxivList(html, 'cs.CY');
    expect(result.items).toHaveLength(1);
    expect(result.truncatedReason).toMatch(/count-mismatch/);
  });
});

describe('validateArxivListFinalUrl', () => {
  it('accepts only the exact configured weekly-list URL', () => {
    expect(validateArxivListFinalUrl(
      'https://arxiv.org/list/cs.CY/pastweek?show=2000',
      'cs.CY',
    )).toBeNull();
  });

  it.each([
    'https://export.arxiv.org/list/cs.CY/pastweek?show=2000',
    'https://arxiv.org/list/cs.HC/pastweek?show=2000',
    'https://arxiv.org/list/cs.CY/recent?show=2000',
    'https://arxiv.org/list/cs.CY/pastweek?show=1000',
    'https://arxiv.org/list/cs.CY/pastweek?show=2000&skip=500',
    'https://arxiv.org/list/cs.CY/pastweek?show=2000&show=2000',
    'https://arxiv.org/list/cs.CY/pastweek?show=2000&extra=1',
  ])('rejects changed final URL %s', (url) => {
    expect(validateArxivListFinalUrl(url, 'cs.CY')).not.toBeNull();
  });
});

describe('parseArxivAbstract', () => {
  it('extracts bounded source and transient abstract text without the descriptor', () => {
    const abstract = 'An evidence-based AI education study. '.repeat(30);
    const result = parseArxivAbstract(
      `<html><body><blockquote class="abstract mathjax"><span class="descriptor">Abstract:</span>${abstract}</blockquote></body></html>`,
    );
    expect(result?.summary).not.toContain('Abstract:');
    expect(result?.summary.length).toBeLessThanOrEqual(401);
    expect(result?.fullText.length).toBeGreaterThan(result?.summary.length ?? 0);
  });

  it('returns null for a page without an abstract', () => {
    expect(parseArxivAbstract('<html><body><h1>Not a paper</h1></body></html>')).toBeNull();
  });
});

function ingested(id: string): IngestedItem {
  return {
    id,
    sourceId: 'arxiv-cs-cy',
    title: `Paper ${id}`,
    summaryOriginal: 'listing metadata',
    fullText: '',
    url: `https://arxiv.org/abs/2608.${id.padStart(5, '0')}`,
    publishedAt: '2026-08-26T00:00:00.000Z',
    topics: ['research'],
    region: 'GLOBAL',
    language: 'en',
  };
}

describe('enrichArxivItems', () => {
  it('advances after a failure and stops when the run cap is filled', async () => {
    const seen: string[] = [];
    const result = await enrichArxivItems(
      [ingested('1'), ingested('2'), ingested('3'), ingested('4')],
      2,
      async (item) => {
        seen.push(item.id);
        return item.id === '1' ? null : { summary: `abstract ${item.id}`, fullText: `full ${item.id}` };
      },
    );

    expect(seen).toEqual(['1', '2', '3']);
    expect(result.accepted.map((item) => item.id)).toEqual(['2', '3']);
    expect(result).toMatchObject({ attempts: 3, failed: 1, overCap: 1, skipped: 0, exhausted: false });
    expect(result.accepted[0]?.summaryOriginal).toBe('abstract 2');
  });

  it('stops at runCap + 4 attempts and marks the rest skipped', async () => {
    const result = await enrichArxivItems(
      Array.from({ length: 8 }, (_, index) => ingested(String(index + 1))),
      1,
      async () => null,
    );
    expect(result).toMatchObject({
      accepted: [], attempts: 5, failed: 5, overCap: 0, skipped: 3, exhausted: true,
    });
  });

  it('gives each source call its own attempt budget', async () => {
    const pool = Array.from({ length: 6 }, (_, index) => ingested(String(index + 1)));
    const [cy, hc] = await Promise.all([
      enrichArxivItems(pool, 1, async () => null),
      enrichArxivItems(pool.map((item) => ({ ...item, sourceId: 'arxiv-cs-hc' })), 1, async () => null),
    ]);
    expect(cy.attempts).toBe(5);
    expect(hc.attempts).toBe(5);
  });
});
