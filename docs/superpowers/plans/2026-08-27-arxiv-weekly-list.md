# arXiv Weekly List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace one-day arXiv category RSS collection with complete, robots-compliant weekly list collection while preserving relevance judgment, effective run caps, and automatic-publishing safeguards.

**Architecture:** Add a focused `arxiv-list` adapter that parses allowed weekly HTML listings and accepted-paper abstract pages into existing pipeline contracts. Route only the two category sources through it, keep requests behind one serialized 15-second host pacer, and enrich a bounded number of relevant candidates before persistence. Reuse the existing ingest, classifier, safe fetch, summarizer, and report paths.

**Tech Stack:** TypeScript 6, Vitest, linkedom, existing `safeFetch`, Astro/Zod source registry.

---

### Task 1: Register the weekly-list source format

**Files:**
- Modify: `src/domain/source.ts`
- Modify: `src/data/sources.json`
- Modify: `tests/unit/schema.test.ts`
- Modify: `tests/unit/guards.test.ts`

- [ ] **Step 1: Write failing schema and registry tests**

Add a source-schema test that accepts `feedFormat: 'arxiv-list'`. Add registry assertions that `arxiv-cs-cy` and `arxiv-cs-hc` are active, use exact `https://arxiv.org/list/{category}/pastweek?show=2000` URLs, and use `arxiv-list`; assert every active source URL avoids `/api`, and `arxiv-ai-education-query` is inactive with a robots explanation.

```ts
it('accepts the dedicated arXiv weekly-list format', () => {
  expect(sourceSchema.parse(makeSource({
    homepage: 'https://arxiv.org/list/cs.CY/recent',
    feedUrl: 'https://arxiv.org/list/cs.CY/pastweek?show=2000',
    feedFormat: 'arxiv-list',
    officialDomains: ['arxiv.org'],
  })).feedFormat).toBe('arxiv-list');
});
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/unit/schema.test.ts tests/unit/guards.test.ts`

Expected: FAIL because `arxiv-list` is not in `FEED_FORMATS` and the shipped registry still points at RSS/API.

- [ ] **Step 3: Implement the minimum registry change**

Add `arxiv-list` to `FEED_FORMATS`. Change only the three arXiv records: two category sources use the allowed weekly list and record the 2026-08-26 verification; the free-text API source becomes inactive and records the current robots prohibition. Preserve IDs, official domains, relevance modes, topics, and base caps.

```ts
export const FEED_FORMATS = ['rss', 'atom', 'json', 'sitemap', 'arxiv-list', 'none'] as const;
```

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- tests/unit/schema.test.ts tests/unit/guards.test.ts`

Expected: both files pass.

- [ ] **Step 5: Commit**

```bash
git add src/domain/source.ts src/data/sources.json tests/unit/schema.test.ts tests/unit/guards.test.ts
git commit -m "fix: register allowed arXiv weekly lists"
```

### Task 2: Parse weekly listings and abstracts

**Files:**
- Create: `pipeline/src/arxiv-list.ts`
- Create: `pipeline/tests/arxiv-list.test.ts`

- [ ] **Step 1: Write failing parser tests**

Create compact HTML fixtures with two `<h3>` date groups and three `<dt>/<dd>` entries. Assert:

```ts
const result = parseArxivList(html, 'cs.CY');
expect(result.items.map((item) => [item.guid, item.publishedAt])).toEqual([
  ['2608.24778', '2026-08-26T00:00:00.000Z'],
  ['2608.24001', '2026-08-25T00:00:00.000Z'],
]);
expect(result.expectedItems).toBe(2);
expect(result.truncatedReason).toBeNull();
expect(result.error).toBeNull();
```

Cover declared-zero, positive-count-without-items, malformed date/ID, count mismatch with usable items, total above 2000, exact final URL acceptance, and rejection of changed origin/path/category, `skip`, duplicate `show`, or extra parameters. Add an abstract-page fixture and assert descriptor removal, 400-character stored excerpt cap, transient full abstract, and null on missing abstract.

- [ ] **Step 2: Verify RED**

Run: `npm test -- pipeline/tests/arxiv-list.test.ts`

Expected: FAIL because `pipeline/src/arxiv-list.ts` does not exist.

- [ ] **Step 3: Implement the parser**

Use `linkedom.parseHTML`, iterate `#articles` children so each `<h3>` establishes the date for following `<dt>/<dd>` pairs, validate arXiv IDs, and build `RawFeedItem` objects. Parse headings with an explicit English-month table and `Date.UTC`; never use the machine timezone.

```ts
export interface ArxivListResult {
  items: RawFeedItem[];
  expectedItems: number | null;
  parsedItems: number;
  truncatedReason: string | null;
  error: string | null;
}

export function validateArxivListFinalUrl(rawUrl: string, category: string): string | null;
export function parseArxivList(html: string, category: string): ArxivListResult;
export function parseArxivAbstract(html: string): { summary: string; fullText: string } | null;
```

The final URL validator requires HTTPS, exact host `arxiv.org`, exact category path, and exactly one query entry `show=2000`. Abstract parsing selects `.abstract.mathjax`, removes `.descriptor`, normalizes with `toPlainText`, truncates the stored excerpt, and bounds transient text to `MAX_ARTICLE_CHARS`.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- pipeline/tests/arxiv-list.test.ts`

Expected: all parser tests pass.

- [ ] **Step 5: Commit**

```bash
git add pipeline/src/arxiv-list.ts pipeline/tests/arxiv-list.test.ts
git commit -m "feat: parse complete arXiv weekly lists"
```

### Task 3: Canonicalize historical arXiv URLs

**Files:**
- Modify: `pipeline/src/ingest.ts`
- Modify: `pipeline/tests/ingest.test.ts`
- Modify: `pipeline/src/run.ts`

- [ ] **Step 1: Write failing canonicalization tests**

Add a table proving these forms share one canonical URL and story ID:

```ts
it.each([
  'http://arxiv.org/abs/2608.17522v1',
  'https://export.arxiv.org/abs/2608.17522V2/',
  'https://arxiv.org/pdf/2608.17522.pdf',
])('normalizes arXiv variant %s', (url) => {
  expect(canonicalUrl(url)).toBe('https://arxiv.org/abs/2608.17522');
});
```

Include an old-style mixed-case ID and prove non-arXiv normalization is unchanged. Export a small helper from `run.ts` and test that duplicate state contains both stored record IDs and IDs recomputed from stored URLs.

- [ ] **Step 2: Verify RED**

Run: `npm test -- pipeline/tests/ingest.test.ts pipeline/tests/run.test.ts`

Expected: FAIL because versions, PDF paths, hosts, and schemes currently hash differently and duplicate state uses stored IDs only.

- [ ] **Step 3: Implement canonical arXiv identities**

In `canonicalUrl`, detect `arxiv.org` and `export.arxiv.org`, extract IDs from `/abs/` or `/pdf/`, remove `.pdf`, trailing slash and `/v\d+$/i`, lowercase the recognized ID, and return `https://arxiv.org/abs/{id}`. Add:

```ts
export function existingStoryIds(stories: readonly Story[]): Set<string> {
  return new Set(stories.flatMap((story) => [story.id, storyId(story.url)]));
}
```

Use it in `main()` instead of `new Set(existing.map((story) => story.id))`.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- pipeline/tests/ingest.test.ts pipeline/tests/run.test.ts`

Expected: canonicalization and historical duplicate tests pass.

- [ ] **Step 5: Commit**

```bash
git add pipeline/src/ingest.ts pipeline/src/run.ts pipeline/tests/ingest.test.ts pipeline/tests/run.test.ts
git commit -m "fix: deduplicate arXiv URL variants"
```

### Task 4: Serialize host pacing

**Files:**
- Modify: `pipeline/src/article.ts`
- Modify: `pipeline/tests/article.test.ts`

- [ ] **Step 1: Write a failing concurrent pacing test**

Start two calls without awaiting the first and use an injected virtual clock/sleep. Assert the second same-host request waits 15 seconds while a different host remains independent.

```ts
const first = pace('https://arxiv.org/list/cs.CY/pastweek?show=2000', now);
const second = pace('https://arxiv.org/abs/2608.24778', now);
await Promise.all([first, second]);
expect(slept).toEqual([15_000]);
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- pipeline/tests/article.test.ts`

Expected: the concurrent same-host assertion fails because both callers can observe no prior request.

- [ ] **Step 3: Implement a per-host promise queue**

Keep the existing `createHostPacer` signature. Store one tail promise per host; each call chains its delay calculation after the previous tail and awaits its own queued operation. Swallow only tail bookkeeping rejections so one caller cannot permanently poison the queue.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- pipeline/tests/article.test.ts`

Expected: existing pacing tests and the new concurrency test pass.

- [ ] **Step 5: Commit**

```bash
git add pipeline/src/article.ts pipeline/tests/article.test.ts
git commit -m "fix: serialize per-host request pacing"
```

### Task 5: Integrate bounded weekly collection and reporting

**Files:**
- Modify: `pipeline/src/contracts.ts`
- Modify: `pipeline/src/run.ts`
- Modify: `pipeline/src/arxiv-list.ts`
- Modify: `pipeline/tests/arxiv-list.test.ts`
- Create or modify: `pipeline/tests/run.test.ts`
- Modify: `docs/HANDOFF.md`

- [ ] **Step 1: Write failing orchestration tests**

Export focused helpers rather than invoking the CLI. Test that an arXiv-list response is screened once, relevant candidates are enriched newest-first, per-source attempts stop at `runCap + 4`, the two budgets are independent, success uses parsed abstract text, failure advances to the next candidate, exhausted budget marks partial, and a failed list produces no RSS request.

```ts
export interface ArxivEnrichmentResult {
  accepted: IngestedItem[];
  attempts: number;
  failed: number;
  overCap: number;
  skipped: number;
  exhausted: boolean;
}

export async function enrichArxivItems(
  relevant: readonly IngestedItem[],
  runCap: number,
  fetchAbstract: (item: IngestedItem) => Promise<{ summary: string; fullText: string } | null>,
): Promise<ArxivEnrichmentResult>;
```

Add contract assertions for optional `coverage`, `collectionMethod`, `resolvedUrl`, `expectedItems`, `parsedItems`, and `truncatedReason` fields. Test that `effectiveCap(1, 8)` remains 2 so this change does not alter established publication volume.

- [ ] **Step 2: Verify RED**

Run: `npm test -- pipeline/tests/arxiv-list.test.ts pipeline/tests/run.test.ts`

Expected: FAIL because enrichment and coverage integration do not exist.

- [ ] **Step 3: Implement bounded enrichment**

Implement `enrichArxivItems` with `attemptLimit = runCap + 4`. Stop immediately on `runCap` successes. If the cap fills, classify untouched relevant candidates as over-cap; if the attempt limit exhausts first, classify them as enrichment-skipped and set `exhausted: true`.

- [ ] **Step 4: Integrate collection in `run.ts`**

Create one 15-second arXiv pacer in `main` and pass it to `collect`. For `feedFormat === 'arxiv-list'`, pace, `safeFetch`, validate `finalUrl`, derive the category from the configured path, parse the list, and populate coverage diagnostics. Fatal parse/URL failures skip the source; partial parse results continue with warnings.

During relevance processing, call `acceptCandidates` for arXiv with an unlimited temporary seen set to obtain the complete relevant ordered pool without mutating global duplicate state. Pass its accepted items to `enrichArxivItems`, pacing and `safeFetch`-parsing each `/abs` page. Add only successfully enriched IDs to the real `seenIds`. Merge `not-relevant`, `enrichment-failed`, `enrichment-skipped`, and `over-cap` counts into the source outcome. Generic sources retain the existing path.

```ts
export interface SourceOutcome {
  // existing fields remain
  coverage?: 'complete' | 'partial' | 'failed';
  collectionMethod?: 'feed' | 'sitemap' | 'arxiv-list';
  resolvedUrl?: string;
  expectedItems?: number;
  parsedItems?: number;
  truncatedReason?: string;
}
```

Warnings include every non-complete coverage outcome. ArXiv enriched items carry the truncated abstract in `summaryOriginal` and full abstract only in transient `fullText`, so the generic article-fetch stage does not re-fetch them.

- [ ] **Step 5: Verify targeted integration GREEN**

Run: `npm test -- pipeline/tests/arxiv-list.test.ts pipeline/tests/run.test.ts pipeline/tests/ingest.test.ts pipeline/tests/article.test.ts tests/unit/schema.test.ts tests/unit/guards.test.ts`

Expected: all targeted tests pass.

- [ ] **Step 6: Update operational documentation**

Update `docs/HANDOFF.md` to state that the two categories use complete allowed weekly lists; the API query is inactive under current robots policy; classification initially sees title/comments/subjects; only bounded accepted candidates fetch abstracts; requests to `arxiv.org` observe 15 seconds; coverage diagnostics distinguish complete/partial/failed; and no backfill occurs automatically.

- [ ] **Step 7: Run full verification**

Run: `npm run verify`

Expected: unit tests, type/build checks, and browser tests all pass with zero failures.

- [ ] **Step 8: Run read-only live smoke check**

Fetch each configured `/pastweek?show=2000` page once, at least 15 seconds apart, parse locally, and compare declared with parsed counts. Do not load `.env`, call the model, write `stories.json`, call either arXiv API, push, merge, or deploy.

- [ ] **Step 9: Commit**

```bash
git add pipeline/src/contracts.ts pipeline/src/run.ts pipeline/src/arxiv-list.ts pipeline/tests/arxiv-list.test.ts pipeline/tests/run.test.ts docs/HANDOFF.md
git commit -m "fix: collect complete weekly arXiv listings"
```
