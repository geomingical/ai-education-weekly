import { describe, expect, it } from 'vitest';
import { makeSource, makeStory } from '../../tests/fixtures/stories';
import type { FetchIO } from '../src/fetcher';
import { storyId } from '../src/ingest';
import {
  collect,
  effectiveCap,
  existingStoryIds,
  runOutcomeFor,
  sourceWarnings,
} from '../src/run';

describe('existingStoryIds', () => {
  it('keeps stored ids and recomputes canonical ids from historical URLs', () => {
    const stored = makeStory({
      id: 'historical-id',
      url: 'https://export.arxiv.org/abs/2608.17522v1',
    });
    const ids = existingStoryIds([stored]);
    expect(ids.has('historical-id')).toBe(true);
    expect(ids.has(storyId('https://arxiv.org/abs/2608.17522'))).toBe(true);
  });
});

describe('effectiveCap', () => {
  it('preserves the established two-slot cap for the normal eight-day window', () => {
    expect(effectiveCap(1, 8)).toBe(2);
  });
});

const window = {
  start: new Date('2026-08-20T00:00:00.000Z'),
  end: new Date('2026-08-28T00:00:00.000Z'),
};

function mockIo(fetch: FetchIO['fetch']): FetchIO {
  return {
    fetch,
    resolve: async () => ['151.101.3.42'],
    now: () => new Date('2026-08-27T00:00:00.000Z'),
  };
}

describe('arXiv collection orchestration', () => {
  it('blocks an arXiv redirect to /api before requesting it and has no RSS fallback', async () => {
    const requested: string[] = [];
    const paced: string[] = [];
    const source = makeSource({
      id: 'arxiv-cs-cy',
      homepage: 'https://arxiv.org/list/cs.CY/recent',
      feedUrl: 'https://arxiv.org/list/cs.CY/pastweek?show=2000',
      feedFormat: 'arxiv-list',
      officialDomains: ['arxiv.org'],
    });
    const io = mockIo(async (input) => {
      requested.push(String(input));
      return new Response(null, { status: 302, headers: { location: '/api/query' } });
    });

    const result = await collect(
      [source],
      window,
      8,
      new Set<string>(),
      async (url) => { paced.push(url); },
      io,
    );

    expect(requested).toEqual([source.feedUrl]);
    expect(paced).toEqual([source.feedUrl]);
    expect(result.candidates).toEqual([]);
    expect(result.outcomes[0]).toMatchObject({
      fetchError: 'blocked', coverage: 'failed', collectionMethod: 'arxiv-list',
    });
    expect(requested.some((url) => url.includes('/api') || url.includes('rss.arxiv'))).toBe(false);
  });
});

describe('run reporting', () => {
  it('reports an HTTP 404 with no body as a failed source and failed run', async () => {
    const source = makeSource();
    const result = await collect(
      [source],
      window,
      8,
      new Set<string>(),
      async () => undefined,
      mockIo(async () => new Response('not found', { status: 404 })),
    );
    const warnings = sourceWarnings(result.outcomes);

    expect(result.outcomes[0]).toMatchObject({ status: 404, coverage: 'failed' });
    expect(warnings).toEqual(['test-source: collection failed (status 404)']);
    expect(runOutcomeFor(result.outcomes, warnings)).toBe('failed');
  });
});
