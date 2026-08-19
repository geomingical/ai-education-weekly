import { describe, expect, it } from 'vitest';
import { buildRows, issueLabels, rowsForIssue } from '../../src/domain/rows';
import { makeSource, makeStory } from '../fixtures/stories';

describe('buildRows', () => {
  it('denormalizes the source name, category, and tier onto each row', () => {
    const rows = buildRows([makeStory()], [makeSource({ name: 'EdSurge', tier: 'media' })]);
    expect(rows[0]).toMatchObject({ sourceName: 'EdSurge', sourceTier: 'media' });
  });

  // Auto-publishing means the source list is the only editorial control there
  // is, so deactivating a source must remove its stories on the next build.
  it('drops stories whose source has been deactivated', () => {
    expect(buildRows([makeStory()], [makeSource({ active: false })])).toEqual([]);
  });

  it('drops stories whose source is missing from the registry entirely', () => {
    expect(buildRows([makeStory({ sourceId: 'gone' })], [makeSource()])).toEqual([]);
  });
});

describe('issue grouping', () => {
  it('lists issues newest first', () => {
    const stories = [
      makeStory({ id: 'a'.repeat(16), issue: '2026-W30' }),
      makeStory({ id: 'b'.repeat(16), issue: '2026-W34' }),
      makeStory({ id: 'c'.repeat(16), issue: '2026-W30' }),
    ];
    expect(issueLabels(buildRows(stories, [makeSource()]))).toEqual(['2026-W34', '2026-W30']);
  });

  it('selects only the rows belonging to one issue', () => {
    const stories = [
      makeStory({ id: 'a'.repeat(16), issue: '2026-W30' }),
      makeStory({ id: 'b'.repeat(16), issue: '2026-W34' }),
    ];
    const rows = buildRows(stories, [makeSource()]);
    expect(rowsForIssue(rows, '2026-W34')).toHaveLength(1);
  });
});
