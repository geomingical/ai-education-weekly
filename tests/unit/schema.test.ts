import { describe, expect, it } from 'vitest';
import { storySchema } from '../../src/domain/story';
import { isValidOfficialDomain, loadSources, sourceSchema } from '../../src/domain/source';
import { makeSource, makeStory } from '../fixtures/stories';

describe('story schema', () => {
  it('accepts a well-formed story', () => {
    expect(storySchema.parse(makeStory())).toBeTruthy();
  });

  // Feed content is untrusted: .url() alone would let javascript: through and
  // it would become a clickable link on the page.
  it('rejects a non-https link', () => {
    expect(() => storySchema.parse(makeStory({ url: 'http://example.org/x' }))).toThrow();
    expect(() =>
      storySchema.parse(makeStory({ url: 'javascript:alert(1)' as unknown as string })),
    ).toThrow();
  });

  it('requires at least one topic so a story can never be untagged', () => {
    expect(() => storySchema.parse(makeStory({ topics: [] }))).toThrow();
  });

  it('refuses to call a summary machine-written without the machine text', () => {
    expect(() =>
      storySchema.parse(makeStory({ summarySource: 'machine', summaryZhTW: null })),
    ).toThrow();
  });

  it('refuses source-verbatim when the source gave no summary', () => {
    expect(() =>
      storySchema.parse(makeStory({ summarySource: 'source-verbatim', summaryOriginal: '' })),
    ).toThrow();
  });

  it('rejects a fetch time earlier than the publication time', () => {
    expect(() =>
      storySchema.parse(
        makeStory({ publishedAt: '2026-08-18T12:00:00.000Z', fetchedAt: '2026-08-18T09:00:00.000Z' }),
      ),
    ).toThrow();
  });

  it('rejects an unknown field rather than silently dropping it', () => {
    expect(() =>
      storySchema.parse({ ...makeStory(), sponsored: true } as unknown),
    ).toThrow();
  });
});

// officialDomains doubles as the SSRF allowlist, so an over-permissive entry
// here quietly turns the allowlist into an allow-all.
describe('isValidOfficialDomain', () => {
  it('accepts a normal multi-label domain', () => {
    expect(isValidOfficialDomain('edsurge.com')).toBe(true);
    expect(isValidOfficialDomain('www.gov.uk')).toBe(true);
    expect(isValidOfficialDomain('1edtech.org')).toBe(true);
  });

  it.each([
    ['a bare public suffix', 'com'],
    ['a bare country public suffix', 'gov.tw'],
    ['a single label', 'localhost'],
    ['an IPv4 literal', '127.0.0.1'],
    ['an uppercase host', 'Example.COM'],
    ['a scheme', 'https://example.com'],
    ['a port', 'example.com:8080'],
    ['a path', 'example.com/feed'],
    ['credentials', 'user@example.com'],
    ['whitespace', 'example .com'],
    ['an empty string', ''],
  ])('rejects %s', (_label, value) => {
    expect(isValidOfficialDomain(value)).toBe(false);
  });
});

describe('source schema', () => {
  it('accepts a well-formed source', () => {
    expect(sourceSchema.parse(makeSource())).toBeTruthy();
  });

  it('rejects a feed URL that is not covered by officialDomains', () => {
    expect(() =>
      sourceSchema.parse(makeSource({ feedUrl: 'https://evil.test/feed.xml' })),
    ).toThrow();
  });

  it('accepts a feed on a subdomain of an official domain', () => {
    expect(
      sourceSchema.parse(
        makeSource({
          homepage: 'https://arxiv.org/list/cs.CY/recent',
          feedUrl: 'https://export.arxiv.org/rss/cs.CY',
          officialDomains: ['arxiv.org'],
        }),
      ),
    ).toBeTruthy();
  });

  it('refuses to mark a feedless source active', () => {
    expect(() =>
      sourceSchema.parse(makeSource({ feedUrl: null, feedFormat: 'none', active: true })),
    ).toThrow();
  });

  it('keeps feedUrl and feedFormat consistent', () => {
    expect(() =>
      sourceSchema.parse(makeSource({ feedUrl: null, feedFormat: 'rss', active: false })),
    ).toThrow();
  });

  it('rejects duplicate source ids across the registry', () => {
    expect(() => loadSources([makeSource(), makeSource()])).toThrow(/duplicate source id/);
  });
});

describe('the shipped registry', () => {
  it('parses, and every active source has a fetchable feed', async () => {
    const raw = await import('../../src/data/sources.json', { with: { type: 'json' } });
    const sources = loadSources(raw.default);
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources.filter((entry) => entry.active)) {
      expect(source.feedUrl).not.toBeNull();
      expect(source.feedUrl?.startsWith('https://')).toBe(true);
    }
  });
});
