import { describe, expect, it } from 'vitest';
import {
  applyFilters,
  defaultFilterState,
  parseFilterState,
  serializeFilterState,
  type StoryRow,
} from '../../src/domain/filters';
import { makeStory } from '../fixtures/stories';

function row(overrides: Partial<StoryRow> = {}): StoryRow {
  return {
    story: makeStory(),
    sourceName: 'Test Source',
    sourceCategory: 'edtech-news',
    sourceTier: 'media',
    ...overrides,
  };
}

describe('applyFilters', () => {
  it('returns everything under the default state', () => {
    const rows = [row(), row({ story: makeStory({ id: 'b'.repeat(16) }) })];
    expect(applyFilters(rows, defaultFilterState)).toHaveLength(2);
  });

  it('keeps only rows carrying the selected topic', () => {
    const rows = [
      row({ story: makeStory({ id: 'a'.repeat(16), topics: ['policy'] }) }),
      row({ story: makeStory({ id: 'b'.repeat(16), topics: ['k12'] }) }),
    ];
    const result = applyFilters(rows, { ...defaultFilterState, topic: 'policy' });
    expect(result.map((entry) => entry.story.topics)).toEqual([['policy']]);
  });

  it('filters by source category', () => {
    const rows = [
      row({ sourceCategory: 'policy' }),
      row({ story: makeStory({ id: 'b'.repeat(16) }), sourceCategory: 'research' }),
    ];
    const result = applyFilters(rows, { ...defaultFilterState, category: 'research' });
    expect(result).toHaveLength(1);
    expect(result[0]?.sourceCategory).toBe('research');
  });

  // A globally relevant story is relevant everywhere, so a region filter must
  // return that region's stories PLUS the global ones — not just exact matches.
  it('includes GLOBAL stories when a specific region is selected', () => {
    const rows = [
      row({ story: makeStory({ id: 'a'.repeat(16), region: 'TW' }) }),
      row({ story: makeStory({ id: 'b'.repeat(16), region: 'GLOBAL' }) }),
      row({ story: makeStory({ id: 'c'.repeat(16), region: 'US' }) }),
    ];
    const result = applyFilters(rows, { ...defaultFilterState, region: 'TW' });
    expect(result.map((entry) => entry.story.region).sort()).toEqual(['GLOBAL', 'TW']);
  });

  it('searches the translated headline as well as the original', () => {
    const rows = [
      row({
        story: makeStory({ id: 'a'.repeat(16), title: 'Untranslated', titleZhTW: '教育部新規定' }),
      }),
      row({ story: makeStory({ id: 'b'.repeat(16), title: 'Something else' }) }),
    ];
    const result = applyFilters(rows, { ...defaultFilterState, query: '教育部' });
    expect(result).toHaveLength(1);
  });

  it('sorts newest first', () => {
    const rows = [
      row({ story: makeStory({ id: 'a'.repeat(16), publishedAt: '2026-08-10T00:00:00.000Z' }) }),
      row({ story: makeStory({ id: 'b'.repeat(16), publishedAt: '2026-08-18T00:00:00.000Z' }) }),
    ];
    const result = applyFilters(rows, defaultFilterState);
    expect(result[0]?.story.publishedAt).toBe('2026-08-18T00:00:00.000Z');
  });

  // What actually happened beats who reported it fastest.
  it('ranks a first-party statement above media coverage published the same moment', () => {
    const at = '2026-08-18T00:00:00.000Z';
    const rows = [
      row({ story: makeStory({ id: 'a'.repeat(16), publishedAt: at }), sourceTier: 'media' }),
      row({ story: makeStory({ id: 'b'.repeat(16), publishedAt: at }), sourceTier: 'first-party' }),
    ];
    expect(applyFilters(rows, defaultFilterState)[0]?.sourceTier).toBe('first-party');
  });
});

describe('filter state URL round-trip', () => {
  it('survives serialize then parse', () => {
    const state = {
      topic: 'integrity' as const,
      category: 'research' as const,
      region: 'EU',
      query: 'assessment',
    };
    expect(parseFilterState(serializeFilterState(state))).toEqual(state);
  });

  it('omits an empty query from the URL', () => {
    expect(serializeFilterState(defaultFilterState).has('q')).toBe(false);
  });

  // A shared link with a stale or hostile parameter must still render.
  it('falls back to "all" on unknown values instead of throwing', () => {
    const parsed = parseFilterState('topic=nonsense&category=<script>&region=MARS');
    expect(parsed).toEqual({ topic: 'all', category: 'all', region: 'all', query: '' });
  });
});
