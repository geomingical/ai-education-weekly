import { describe, expect, it } from 'vitest';
import { inferTopics, isEducationRelevant, resolveTopics } from '../src/classify';
import type { RawFeedItem } from '../src/contracts';

function item(title: string, summary = ''): RawFeedItem {
  return { title, summary, fullText: '', link: 'https://example.org/x', publishedAt: null, guid: null };
}

// The gate requires BOTH an education term and an AI term. That is what keeps a
// vendor's general blog and a broad edtech outlet usable as sources.
describe('isEducationRelevant', () => {
  it('accepts an item naming both education and AI', () => {
    expect(isEducationRelevant(item('Teachers Forge Ahead on Integrating AI'))).toBe(true);
  });

  it('rejects AI news with no education angle', () => {
    expect(isEducationRelevant(item('OpenAI appoints a Chief Revenue Officer'))).toBe(false);
  });

  it('rejects education news with no AI angle', () => {
    expect(isEducationRelevant(item("Middle School Students' Struggles in Math"))).toBe(false);
  });

  it('reads the summary as well as the title', () => {
    expect(
      isEducationRelevant(item('A quiet change', 'The university is rolling out ChatGPT for students.')),
    ).toBe(true);
  });

  it('handles Chinese, which has no word boundaries', () => {
    expect(isEducationRelevant(item('教育部公布生成式AI教學指引'))).toBe(true);
    expect(isEducationRelevant(item('心臟瓣膜治療新指引'))).toBe(false);
  });

  // "AI-powered" and "AI." must match; "chair" and "said" must not.
  it('matches AI at punctuation boundaries without matching it inside words', () => {
    expect(isEducationRelevant(item('AI-powered tutoring for students'))).toBe(true);
    expect(isEducationRelevant(item('The chair said the school needs repairs'))).toBe(false);
  });
});

describe('inferTopics', () => {
  it('tags a policy story', () => {
    expect(inferTopics(item('Education department issues AI guidance for schools'))).toContain(
      'policy',
    );
  });

  it('tags academic integrity', () => {
    expect(inferTopics(item('Universities rethink exams amid AI plagiarism concerns'))).toContain(
      'integrity',
    );
  });

  it('returns nothing when no topic term appears', () => {
    expect(inferTopics(item('Zzzz'))).toEqual([]);
  });

  // A long tag list stops being scannable.
  it('caps the tag list at three', () => {
    const busy = item(
      'Ministry policy on AI in schools, universities, teacher training, product launches, research and cheating',
    );
    expect(inferTopics(busy).length).toBeLessThanOrEqual(3);
  });
});

describe('resolveTopics', () => {
  it('prefers topics found in the item itself', () => {
    expect(resolveTopics(item('New AI regulation for schools'), ['research'])).toContain('policy');
  });

  // The story schema requires at least one topic, so an untagged story must be
  // impossible by construction.
  it('falls back to the source default when nothing matches', () => {
    expect(resolveTopics(item('Zzzz'), ['research'])).toEqual(['research']);
  });
});
