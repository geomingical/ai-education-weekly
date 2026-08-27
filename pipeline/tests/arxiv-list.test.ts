import { describe, expect, it } from 'vitest';
import {
  parseArxivAbstract,
  parseArxivList,
  validateArxivListFinalUrl,
} from '../src/arxiv-list';

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
