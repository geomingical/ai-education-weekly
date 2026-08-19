import type { Source } from '../../src/domain/source';
import type { Story } from '../../src/domain/story';

export function makeStory(overrides: Partial<Story> = {}): Story {
  return {
    id: 'a1b2c3d4e5f60718',
    sourceId: 'test-source',
    title: 'AI tutoring arrives in schools',
    summaryOriginal: 'The district is piloting an AI tutor in twelve schools.',
    titleZhTW: null,
    summaryZhTW: null,
    summarySource: 'source-verbatim',
    url: 'https://example.org/story',
    publishedAt: '2026-08-18T09:00:00.000Z',
    fetchedAt: '2026-08-18T12:00:00.000Z',
    issue: '2026-W34',
    topics: ['k12'],
    region: 'US',
    language: 'en',
    ...overrides,
  };
}

export function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    id: 'test-source',
    name: 'Test Source',
    homepage: 'https://example.org/',
    feedUrl: 'https://example.org/feed.xml',
    feedFormat: 'rss',
    urlPattern: null,
    category: 'edtech-news',
    language: 'en',
    region: 'US',
    officialDomains: ['example.org'],
    tier: 'media',
    relevanceMode: 'keyword',
    defaultTopics: ['k12'],
    maxPerRun: 8,
    active: true,
    licenseNote: 'Summary and link only.',
    lastVerified: '2026-08-18',
    notes: '',
    ...overrides,
  };
}
