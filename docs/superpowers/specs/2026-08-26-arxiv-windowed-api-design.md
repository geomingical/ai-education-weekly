# Complete Weekly arXiv Collection Design

## Goal

Inspect the complete weekly announcement lists for the configured `cs.CY` and
`cs.HC` categories without violating arXiv's current robots policy, then retain
the existing relevance judgment and editorial caps when selecting stories for
the weekly digest.

## Evidence and root cause

The workflow runs once on Monday with an eight-day ingest window. That window
filters only items returned by a source; it cannot recover entries that a feed
no longer exposes. On 2026-08-26, both category RSS feeds carried items from
only that date. In the 2026-08-24 scheduled run, both feeds returned zero items,
so the weekly schedule and single-announcement RSS feeds are structurally
mismatched.

The first design proposed paged arXiv API category queries. Review exposed a
second, decisive constraint. On 2026-08-26:

- the official API manual documented `start`/`max_results` paging,
  `lastUpdatedDate`, OpenSearch result counts, and a three-second delay;
- `https://export.arxiv.org/robots.txt` returned `Disallow: /`; and
- `https://arxiv.org/robots.txt` explicitly disallowed `/api` while allowing
  `/list` and `/abs` with `Crawl-delay: 15`.

The project rules forbid activating a source whose robots policy forbids the
automated request. API paging is therefore not an acceptable implementation,
regardless of retry quality. The existing active
`arxiv-ai-education-query` source also uses the now-disallowed API and must not
continue automated collection until arXiv permits that endpoint again.

## Chosen approach

Use arXiv's allowed weekly listing pages:

- `https://arxiv.org/list/cs.CY/pastweek?show=2000`
- `https://arxiv.org/list/cs.HC/pastweek?show=2000`

These pages group entries under announcement-date headings and expose the arXiv
ID, title, comments, and subjects. A live check on 2026-08-26 returned all five
announcement days shown by each page in one response. The collector parses
every entry, assigns its enclosing announcement date, and sends the combined
weekly pool through the existing date gate and relevance classifier.

Each heading is a calendar date without a time or offset. The collector stores
it as `00:00:00Z` on that displayed date. This is an explicit calendar-date
surrogate, not a claim about the paper's submission time. UTC preserves the
displayed date and matches the observed announcement rollover. The default
eight-day window is wider than the five announcement days on `pastweek`; a
boundary test fixes this conversion so local runner time zones cannot change it.

The listing does not contain abstracts. The initial relevance decision will use
the title, comments, and subjects. Relevant candidates are ordered newest first,
then their allowed `/abs/{id}` pages are fetched one at a time until the source
cap is filled or that source has made `maxPerRun + 4` enrichment attempts in the
current run. The budget is independent for `cs.CY` and `cs.HC`. A failed or
malformed abstract page records an `enrichment-failed` rejection and the next
relevant candidate is tried. If the cap is filled, later relevant candidates
retain the existing `over-cap` outcome. If the attempt budget is exhausted
before the cap is filled, remaining candidates record `enrichment-skipped`, and
the source is marked partial with `truncatedReason: enrichment-budget`. Listing
metadata is never published as if it were the source abstract. A targeted arXiv
abstract parser replaces the temporary listing excerpt before summarization and
persistence. The full abstract is transient model input; the existing summary
truncation rule remains the only source text stored and displayed.

The current `arxiv-ai-education-query` source will be set inactive and its note
and verification date will record the robots restriction. This reduces
discovery outside `cs.CY` and `cs.HC`; the run report and documentation must not
imply otherwise.

## Editorial selection

Retrieval coverage and publication volume remain separate:

1. parse the complete weekly category listing;
2. apply the existing date, URL, and duplicate gates;
3. classify relevance from title, comments, and subjects;
4. order relevant candidates deterministically by announcement date descending;
5. enrich candidates from `/abs` in that order, skipping and recording failures;
   and
6. stop when `maxPerRun` candidates have been enriched or after that source has
   made `maxPerRun + 4` attempts in the current run.

The source caps remain `1` for each category. This means the pipeline inspects
the whole weekly pool but publishes at most one relevant story per category.
Over-cap candidates stay visible in rejection counts and are not presented as
published coverage.

## Completeness and failure handling

The listing page states a total entry count and how many entries are shown. The
collector compares those values with the parsed entry count. Outcomes are
defined as follows:

- a declared total of zero with a valid empty article container is complete and
  empty;
- a missing article container, invalid declared count, or zero usable entries
  when the declared total is positive fails the source and publishes nothing;
- individual malformed headings, IDs, or entry structures are omitted, and a
  count mismatch with at least one usable entry is partial; and
- a declared total above the requested `show=2000` bound is partial because the
  single response cannot prove complete coverage.

Partial results may continue through the normal gates, but the warning and
coverage fields must make the incomplete source visible.

The collector also verifies the `safeFetch` result's `finalUrl`. Its origin must
be `https://arxiv.org`, its path must remain `/list/{category}/pastweek`, and its
query must contain exactly one parameter, `show=2000`. A `skip` parameter,
duplicate `show`, or any other query parameter fails the source. Any redirect or
normalization that changes those values fails the source even if the returned
HTML happens to parse. The resolved URL is recorded for diagnosis.

There is no RSS fallback. A missing weekly list is reported as a failed source
rather than presenting a single announcement batch as weekly coverage.

The report will add optional collection details to each source outcome:

- `coverage`: `complete`, `partial`, or `failed`;
- `collectionMethod`: `feed`, `sitemap`, or `arxiv-list`;
- `resolvedUrl` for the final validated collection response;
- `expectedItems` and `parsedItems` when the source declares a count; and
- `truncatedReason` when coverage is partial.

Existing `itemsSeen`, `itemsInWindow`, accepted/rejected counts, and rejection
histograms remain unchanged. Optional fields avoid changing historical report
consumers while making empty, incomplete, and complete collection distinguishable.

## Request pacing

All `arxiv.org` listing and abstract requests share a serialized per-host pacer
that enforces at least the published 15-second crawl delay. The current source
loop is sequential, so a concurrency race does not exist today; serialization
keeps the constraint explicit if collection becomes concurrent later. The
enrichment-attempt budget bounds the worst case to `maxPerRun + 4` abstract
requests per source. With the current two category sources and `maxPerRun: 1`,
the network maximum is two list requests plus ten abstract requests. At the
required 15-second shared-host pace, that is roughly three minutes of serialized
waiting rather than an unbounded walk through every relevant paper.

No request is made to `rss.arxiv.org` or either disallowed API path.

Network failures continue to use the existing bounded `safeFetch` behavior.
This design adds no long `Retry-After` sleep and cannot stall the rest of the run
behind an unbounded server-supplied delay.

## Components and boundaries

- `pipeline/src/arxiv-list.ts` parses weekly list HTML and accepted-paper
  abstract pages into existing `RawFeedItem` data. It uses the already-installed
  `linkedom` package and does not execute page scripts.
- `pipeline/src/run.ts` routes the two configured category sources through the
  weekly-list collector, shares the arXiv pacer, enriches only accepted arXiv
  candidates, and records explicit coverage metadata.
- `pipeline/src/contracts.ts` adds only optional source-outcome diagnostics; it
  does not change story or source records.
- `pipeline/src/ingest.ts` canonicalizes arXiv abstract URLs to
  `https://arxiv.org/abs/{id}`. For recognized arXiv IDs it treats
  `arxiv.org` and `export.arxiv.org`, `/abs/{id}` and `/pdf/{id}`, HTTP and
  HTTPS, a trailing slash, a version suffix such as `v2`, and letter case in a
  legacy ID as the same paper. Query strings and fragments remain covered by
  the general URL normalizer. Startup duplicate state includes both stored IDs
  and IDs recomputed from stored URLs, so historical variants prevent
  republication. Non-arXiv URL behavior is unchanged.
- `src/domain/source.ts` adds one explicit `arxiv-list` feed format rather than
  pretending HTML is RSS.
- `src/data/sources.json` switches `arxiv-cs-cy` and `arxiv-cs-hc` to the
  allowed weekly listing URLs, preserves their IDs and caps, and deactivates the
  forbidden API query with an evidence-based note.
- `docs/HANDOFF.md` records the coverage model, robots decision, 15-second pace,
  title-first relevance limitation, and reduced out-of-category discovery.

No dependency, story schema, workflow trigger, secret, schedule, or public UI
behavior changes.

## Testing strategy

Tests will be written and observed failing before implementation. They will
prove that:

1. all entries across multiple date headings are parsed with the correct
   announcement date;
2. the parsed count must match the listing's declared total;
3. malformed dates, IDs, or article structure produce an explicit incomplete
   outcome rather than zero successful items;
4. the combined weekly pool reaches screening once, without entries being
   dropped or duplicated at the collector boundary;
5. relevance is applied before the deterministic newest-first cap;
6. only relevant category candidates fetch `/abs` pages, a failed enrichment
   advances to the next ranked candidate, no more than `maxPerRun + 4` pages are
   fetched per source, the two source budgets are independent, and every stored
   source excerpt comes from a parsed abstract rather than listing metadata;
7. two arXiv requests started together remain at least 15 virtual seconds apart;
8. a changed final origin, category path, `pastweek` path, `show` value, added
   `skip`, duplicate `show`, or any extra query parameter fails the source even
   when the response body is parseable;
9. weekly-list failure remains a failed source outcome without RSS fallback;
10. constructed list and abstract URLs pass the existing allowlist checks
    without widening `officialDomains`;
11. versioned, unversioned, HTTP, HTTPS, `export` host, `/abs`, `/pdf`, trailing
    slash, and case variants of the same arXiv ID produce one canonical ID,
    including against historical stored URLs;
12. date headings always become midnight UTC and behave deterministically at
    the ingest-window boundary;
13. the two active category sources use `/list/.../pastweek` with
    `feedFormat: arxiv-list`; and
14. the disallowed API source is inactive and no active source requests an
    `/api` path.

Final verification is `npm run verify`, which runs unit tests, the production
build, and browser tests. A separate read-only smoke check may fetch the two
weekly listings and confirm declared and parsed counts; it must not call the
disallowed API.

## Human checkpoints

Implementation requires explicit approval for two project-controlled changes:

1. changing the source schema to add `arxiv-list`; and
2. changing registered sources, including deactivating
   `arxiv-ai-education-query` because its endpoint is currently disallowed.

The user's approval applies to a local test branch only. It does not authorize
pushing, merging, deploying, changing secrets, or changing the schedule.

## Out of scope

- Using either arXiv API endpoint while its robots policy forbids access.
- Increasing the number of arXiv stories published per week.
- Adding more arXiv categories to replace the disabled free-text query.
- Changing AI-education relevance criteria.
- Changing the weekly schedule or publishing cadence.
- Backfilling already missed historical issues.
- Pushing the branch, opening a pull request, merging, or deploying.
