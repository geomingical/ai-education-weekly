import { describe, expect, it } from 'vitest';
import { makeStory } from '../../tests/fixtures/stories';
import { storyId } from '../src/ingest';
import { effectiveCap, existingStoryIds } from '../src/run';

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
