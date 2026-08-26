# Windowed arXiv API Collection Design

## Goal

Ensure the weekly digest can discover every arXiv submission returned for the
configured `cs.CY` and `cs.HC` categories during its collection window, even
though arXiv's category RSS feeds expose only one announcement batch at a time.

## Evidence and root cause

The weekly workflow runs once on Monday with an eight-day window. That window
currently filters only the items present in each fetched feed; it cannot recover
items the feed no longer returns. On 2026-08-26, both category RSS feeds carried
items from only that date. In the 2026-08-24 scheduled run, both feeds returned
zero items and the separate AI-and-education API query returned HTTP 429, so the
run published no arXiv coverage while otherwise succeeding.

The root cause is therefore a mismatch between a weekly collector and
single-announcement category feeds. The date filter is working as implemented,
but it operates after source retrieval and cannot expand the source's history.

## Chosen approach

Replace the two category RSS URLs with arXiv API category queries sorted by
`submittedDate` descending. Keep the existing AI-and-education API query as a
separate discovery path because it can find relevant papers outside `cs.CY` and
`cs.HC`.

The pipeline will recognize arXiv API sources and collect them page by page.
Each page is parsed through the existing Atom parser. Paging stops when a page
contains no entries, when the oldest submitted date is before the collection
window, or when a bounded safety limit is reached. Items from all fetched pages
then pass through the existing date gate, relevance classifier, duplicate gate,
and per-source publication cap.

This keeps retrieval coverage separate from editorial volume: the pipeline may
inspect a full week of category results while still publishing at most the
configured `maxPerRun` number of relevant stories.

## Request pacing and failure handling

All arXiv API requests in a run share a pacer so consecutive requests are at
least three seconds apart. HTTP 429 and transient 5xx responses receive a small,
bounded number of retries using the server's `Retry-After` value when usable,
otherwise a deterministic increasing delay. Permanent errors are not retried.

If the first page cannot be fetched, the source remains a failed source outcome
as it is today. If a later page fails, the source keeps the earlier pages but
records a warning that collection was partial. Empty and failed outcomes remain
visible rather than being converted into successful-looking results.

Retries and sleeps will be dependency-injected in tests so the test suite makes
no real network calls and does not wait in real time.

## Components and boundaries

- `pipeline/src/arxiv.ts` owns arXiv API URL paging, request pacing, retry
  decisions, and the bounded stop conditions. It returns parsed raw feed items
  plus explicit failure or partial-collection information.
- `pipeline/src/run.ts` selects that collector for arXiv API sources and leaves
  non-arXiv RSS, Atom, JSON Feed, and sitemap behavior unchanged.
- `src/data/sources.json` changes only the two category source URLs and formats;
  source IDs, editorial caps, relevance modes, and active states remain intact.
- The existing `safeFetch`, Atom parser, ingest gate, classifier, story schema,
  and merge behavior remain the source of truth for their current concerns.

No dependency, story/source schema, workflow trigger, secret, or public display
behavior changes.

## Testing strategy

Automated tests will prove that:

1. multiple API pages are combined when the first page does not cover the full
   date window;
2. paging stops after crossing the window boundary;
3. duplicate entries across pages remain harmless to the existing ingest gate;
4. HTTP 429 and transient 5xx responses retry with injected waits;
5. permanent failures do not retry;
6. a later-page failure is reported as partial rather than silently complete;
7. non-arXiv feed collection behavior is unchanged; and
8. the registry contains API category queries rather than category RSS URLs.

Tests for each new behavior will be written and observed failing before the
minimal implementation is added. Final verification is `npm run verify`, which
runs unit tests, the production build, and browser tests.

## Out of scope

- Changing how many arXiv stories are published per week.
- Broadening or changing AI-education relevance judgment.
- Changing the weekly schedule or publishing cadence.
- Backfilling already missed historical issues as part of this branch.
- Pushing the branch, opening a pull request, merging, or deploying.
