// Weekly run orchestrator.
//
//   read registry -> fetch each active feed -> parse -> ingest gate ->
//   summarize (best effort) -> merge into src/data/stories.json -> report
//
// The merge is additive: existing story records are never rewritten, so a
// re-run cannot change what a reader already saw, and a model outage cannot
// strip summaries off stories that already have them.
//
// Known property, not a bug: an already-published item is rejected as a
// duplicate BEFORE it reaches the per-source cap, so it does not consume a cap
// slot. That is what a weekly schedule needs — last week's stories must not
// crowd out this week's — but it means re-running the SAME window twice admits
// a further capful each time. Backfill with one run at the window you want.
//
// Exit code is 0 for a completed or degraded run and 1 only when the run could
// not produce a usable result at all. A single failing feed is not a failure.

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lookup } from 'node:dns/promises';
import { parseFeed } from './feed-parser';
import { safeFetch, type FetchIO } from './fetcher';
import { ingestSourceItems, type IngestedItem, type IngestSource } from './ingest';
import { summarizeAll, type SummaryInput } from './summarize/summarizer';
import { createHttpTransport } from './summarize/transport';
import type { RunReport, SourceOutcome } from './contracts';
import { loadSources, type Source } from '../../src/domain/source';
import { issueLabelFromIso } from '../../src/domain/issue';
import type { Story } from '../../src/domain/story';

const ROOT = resolve(import.meta.dirname, '../..');
const SOURCES_PATH = resolve(ROOT, 'src/data/sources.json');
const STORIES_PATH = resolve(ROOT, 'src/data/stories.json');
const AGENTS_PATH = resolve(ROOT, 'pipeline/config/agents.json');

/** How far back a weekly run looks. Slightly over a week so a run that slips a
 *  day does not silently drop the stories it would have covered. Override with
 *  `--since <days>` to backfill the archive on a first run. */
const DEFAULT_WINDOW_DAYS = 8;

/** Reads `--since <days>`; falls back to the weekly default on anything else. */
export function parseWindowDays(argv: readonly string[]): number {
  const index = argv.indexOf('--since');
  if (index === -1) return DEFAULT_WINDOW_DAYS;
  const value = Number(argv[index + 1]);
  if (!Number.isFinite(value) || value <= 0 || value > 400) return DEFAULT_WINDOW_DAYS;
  return Math.floor(value);
}

const io: FetchIO = {
  fetch: globalThis.fetch,
  resolve: async (hostname) => {
    const records = await lookup(hostname, { all: true });
    return records.map((record) => record.address);
  },
  now: () => new Date(),
};

function log(message: string): void {
  // stdout carries exactly one JSON document (the report), so every human-
  // readable line goes to stderr.
  process.stderr.write(`${message}\n`);
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readExistingStories(): Promise<Story[]> {
  try {
    const parsed = await readJson(STORIES_PATH);
    return Array.isArray(parsed) ? (parsed as Story[]) : [];
  } catch {
    // First run: no file yet.
    return [];
  }
}

function toIngestSource(source: Source): IngestSource {
  return {
    id: source.id,
    officialDomains: source.officialDomains,
    relevanceMode: source.relevanceMode,
    defaultTopics: source.defaultTopics,
    maxPerRun: source.maxPerRun,
    region: source.region,
    language: source.language,
  };
}

/**
 * `maxPerRun` is authored as a per-WEEK budget, because that is the unit the
 * product publishes in. A backfill run covering several weeks must therefore
 * scale it, or a 45-day backfill would admit the same handful of arXiv papers
 * as a single week and leave the archive looking empty.
 */
export function effectiveCap(maxPerRun: number, windowDays: number): number {
  return maxPerRun * Math.max(1, Math.ceil(windowDays / 7));
}

async function collect(
  sources: readonly Source[],
  window: { start: Date; end: Date },
  windowDays: number,
  seenIds: Set<string>,
): Promise<{ items: IngestedItem[]; outcomes: SourceOutcome[] }> {
  const items: IngestedItem[] = [];
  const outcomes: SourceOutcome[] = [];

  for (const source of sources) {
    if (!source.active || source.feedUrl === null) continue;

    log(`fetching ${source.id} …`);
    const fetched = await safeFetch(source.feedUrl, source.officialDomains, io);

    const outcome: SourceOutcome = {
      sourceId: source.id,
      feedUrl: source.feedUrl,
      status: fetched.status,
      fetchError: fetched.error,
      parseError: null,
      itemsSeen: 0,
      itemsInWindow: 0,
      itemsAccepted: 0,
      itemsRejected: 0,
      rejectCounts: {},
    };

    if (fetched.error !== null || fetched.body === null) {
      outcomes.push(outcome);
      log(`  ${source.id}: no body (status ${fetched.status}, error ${fetched.error})`);
      continue;
    }

    const parsed = parseFeed(fetched.body);
    outcome.parseError = parsed.error;
    outcome.itemsSeen = parsed.items.length;

    if (parsed.error !== null) {
      outcomes.push(outcome);
      log(`  ${source.id}: parse failed — ${parsed.error}`);
      continue;
    }

    const result = ingestSourceItems(
      { ...toIngestSource(source), maxPerRun: effectiveCap(source.maxPerRun, windowDays) },
      parsed.items,
      window,
      seenIds,
    );
    outcome.itemsAccepted = result.accepted.length;
    outcome.itemsRejected = result.rejected.length;
    outcome.rejectCounts = result.rejectCounts as Record<string, number>;
    // "In window" means the date check passed — the pool the relevance gate and
    // the cap actually chose from.
    outcome.itemsInWindow =
      result.accepted.length +
      result.rejected.filter(
        (entry) =>
          entry.reason !== 'outside-window' &&
          entry.reason !== 'future-dated' &&
          entry.reason !== 'no-date',
      ).length;

    items.push(...result.accepted);
    outcomes.push(outcome);
    log(`  ${source.id}: ${result.accepted.length} accepted of ${parsed.items.length} seen`);
  }

  return { items, outcomes };
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const windowDays = parseWindowDays(process.argv);
  const now = new Date();
  const window = {
    start: new Date(now.getTime() - windowDays * 86_400_000),
    end: now,
  };
  log(`window: ${windowDays} days back from ${now.toISOString()}`);

  const sources = loadSources(await readJson(SOURCES_PATH));
  const existing = await readExistingStories();
  const seenIds = new Set(existing.map((story) => story.id));

  const { items, outcomes } = await collect(sources, window, windowDays, seenIds);
  const warnings: string[] = outcomes
    .filter((outcome) => outcome.fetchError !== null || outcome.parseError !== null)
    .map(
      (outcome) =>
        `${outcome.sourceId}: ${outcome.fetchError ?? outcome.parseError} (status ${outcome.status})`,
    );

  // --- summarization (best effort) ---
  const apiKey = process.env['AI_EDU_API_KEY'] ?? process.env['NVIDIA_API_KEY'] ?? '';
  const agents = (await readJson(AGENTS_PATH)) as {
    summarizer: { baseUrl: string; model: string; maxOutputTokens: number };
  };
  const summaryConfig = agents.summarizer;

  const summaryById = new Map<string, { titleZhTW: string; summaryZhTW: string }>();
  let summaries = { requested: 0, succeeded: 0, failed: 0, skippedReason: null as string | null };

  if (items.length === 0) {
    summaries.skippedReason = 'no new stories to summarize';
  } else if (apiKey.length === 0) {
    // No key is a normal local-development state, not an error. Stories still
    // publish, carrying the source's own summary and untranslated headline.
    summaries.skippedReason = 'no AI_EDU_API_KEY / NVIDIA_API_KEY set';
    warnings.push('summarization skipped: no API key; stories publish with source-verbatim summaries');
  } else {
    const sourceNames = new Map(sources.map((source) => [source.id, source.name]));
    const inputs: SummaryInput[] = items.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summaryOriginal,
      sourceName: sourceNames.get(item.sourceId) ?? item.sourceId,
    }));

    log(`summarizing ${inputs.length} stories …`);
    const transport = createHttpTransport({
      baseUrl: summaryConfig.baseUrl,
      apiKey,
    });
    const result = await summarizeAll(inputs, transport, {
      model: summaryConfig.model,
      maxOutputTokens: summaryConfig.maxOutputTokens,
    });

    for (const output of result.outputs) {
      summaryById.set(output.id, {
        titleZhTW: output.titleZhTW,
        summaryZhTW: output.summaryZhTW,
      });
    }
    summaries = {
      requested: inputs.length,
      succeeded: result.outputs.length,
      failed: result.failures,
      skippedReason: null,
    };
    warnings.push(...result.errors.map((error) => `summarizer: ${error}`));
  }

  // --- build story records ---
  const fetchedAt = now.toISOString();
  const newStories: Story[] = items.map((item) => {
    const machine = summaryById.get(item.id) ?? null;
    return {
      id: item.id,
      sourceId: item.sourceId,
      title: item.title,
      summaryOriginal: item.summaryOriginal,
      titleZhTW: machine?.titleZhTW ?? null,
      summaryZhTW: machine?.summaryZhTW ?? null,
      summarySource: machine
        ? 'machine'
        : item.summaryOriginal.length > 0
          ? 'source-verbatim'
          : 'none',
      url: item.url,
      publishedAt: item.publishedAt,
      fetchedAt,
      issue: issueLabelFromIso(item.publishedAt),
      topics: item.topics,
      region: item.region,
      language: item.language,
    };
  });

  const merged = [...existing, ...newStories].sort(
    (left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt),
  );

  const anyFeedSucceeded = outcomes.some(
    (outcome) => outcome.fetchError === null && outcome.parseError === null,
  );
  const report: RunReport = {
    runAt: fetchedAt,
    issue: issueLabelFromIso(fetchedAt),
    windowStart: window.start.toISOString(),
    windowEnd: window.end.toISOString(),
    outcome: !anyFeedSucceeded ? 'failed' : warnings.length > 0 ? 'completed-with-warnings' : 'completed',
    sources: outcomes,
    summaries,
    storiesAdded: newStories.length,
    storiesTotal: merged.length,
    warnings,
  };

  if (!dryRun) {
    await writeFile(STORIES_PATH, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
    log(`wrote ${merged.length} stories to src/data/stories.json`);
  } else {
    log('dry run: src/data/stories.json not written');
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.outcome === 'failed' ? 1 : 0;
}

// Only run when this file is executed directly. Without this, importing the
// module — which the test suite does — would fire the CLI as a side effect.
const isEntryPoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) {
  main().catch((error: unknown) => {
    log(`pipeline crashed: ${(error as Error).stack ?? String(error)}`);
    process.exitCode = 1;
  });
}
