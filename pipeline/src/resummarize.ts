// Backfill Chinese headlines and summaries onto stories that do not have them.
//
// Why this exists as its own entry point: the weekly run only ever summarizes
// what it just collected. If the model was down that week, or the API key was
// missing, those stories are published with the source's own words and would
// stay that way forever. This fills them in afterwards.
//
// It is the ONE place that rewrites an existing story record, and it is
// deliberately narrow about how: it only ever fills `titleZhTW`, `summaryZhTW`,
// and `summarySource`. The original title, the original summary, the URL, the
// date, and the issue are never touched — those are the reader's check on the
// machine, and a backfill must not be able to alter them.

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { summarizeAll, type SummaryInput } from './summarize/summarizer';
import { createHttpTransport } from './summarize/transport';
import { loadSources } from '../../src/domain/source';
import type { Story } from '../../src/domain/story';

const ROOT = resolve(import.meta.dirname, '../..');
const SOURCES_PATH = resolve(ROOT, 'src/data/sources.json');
const STORIES_PATH = resolve(ROOT, 'src/data/stories.json');
const AGENTS_PATH = resolve(ROOT, 'pipeline/config/agents.json');

function log(message: string): void {
  process.stderr.write(`${message}\n`);
}

/** Reads `--limit <n>`, for trying the model on a handful before committing to all. */
export function parseLimit(argv: readonly string[]): number | null {
  const index = argv.indexOf('--limit');
  if (index === -1) return null;
  const value = Number(argv[index + 1]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
}

/** Stories still carrying the source's own words rather than a machine summary. */
export function needsSummary(stories: readonly Story[]): Story[] {
  return stories.filter((story) => story.summarySource !== 'machine');
}

/**
 * Fills in the Chinese fields and nothing else. Returns a new array; the input
 * stories are not mutated.
 */
export function applySummaries(
  stories: readonly Story[],
  byId: ReadonlyMap<string, { titleZhTW: string; summaryZhTW: string }>,
): Story[] {
  return stories.map((story) => {
    const machine = byId.get(story.id);
    if (!machine) return story;
    return {
      ...story,
      titleZhTW: machine.titleZhTW,
      summaryZhTW: machine.summaryZhTW,
      summarySource: 'machine',
    };
  });
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const limit = parseLimit(process.argv);

  const apiKey = process.env['AI_EDU_API_KEY'] ?? process.env['NVIDIA_API_KEY'] ?? '';
  if (apiKey.length === 0) {
    log('no AI_EDU_API_KEY / NVIDIA_API_KEY set — nothing to do');
    process.exitCode = 1;
    return;
  }

  const stories = JSON.parse(await readFile(STORIES_PATH, 'utf8')) as Story[];
  const sources = loadSources(JSON.parse(await readFile(SOURCES_PATH, 'utf8')));
  const sourceNames = new Map(sources.map((source) => [source.id, source.name]));

  const pending = needsSummary(stories);
  const targets = limit === null ? pending : pending.slice(0, limit);
  log(`${pending.length} stories without a machine summary; summarizing ${targets.length}`);
  if (targets.length === 0) return;

  const agents = JSON.parse(await readFile(AGENTS_PATH, 'utf8')) as {
    summarizer: { baseUrl: string; model: string; maxOutputTokens: number };
  };
  const config = agents.summarizer;
  const modelOverrideIndex = process.argv.indexOf('--model');
  const model =
    modelOverrideIndex === -1 ? config.model : (process.argv[modelOverrideIndex + 1] ?? config.model);

  const inputs: SummaryInput[] = targets.map((story) => ({
    id: story.id,
    title: story.title,
    summary: story.summaryOriginal,
    sourceName: sourceNames.get(story.sourceId) ?? story.sourceId,
  }));

  const started = Date.now();
  const result = await summarizeAll(
    inputs,
    createHttpTransport({ baseUrl: config.baseUrl, apiKey }),
    { model, maxOutputTokens: config.maxOutputTokens },
  );
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  const byId = new Map(
    result.outputs.map((output) => [
      output.id,
      { titleZhTW: output.titleZhTW, summaryZhTW: output.summaryZhTW },
    ]),
  );
  const updated = applySummaries(stories, byId);

  log(`model=${model} ${elapsed}s — ${result.outputs.length} summarized, ${result.failures} fell back`);
  for (const error of result.errors) log(`  ${error}`);

  if (dryRun) {
    // Show the actual text. Counts alone cannot tell you whether a model is
    // producing something worth publishing.
    for (const output of result.outputs) {
      const story = stories.find((entry) => entry.id === output.id);
      log('');
      log(`  原 ${story?.title.slice(0, 88) ?? ''}`);
      log(`  中 ${output.titleZhTW}`);
      log(`  摘 ${output.summaryZhTW}`);
    }
    log('');
    log('dry run: src/data/stories.json not written');
  } else {
    await writeFile(STORIES_PATH, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
    log(`wrote ${updated.length} stories`);
  }
}

// Only run when this file is executed directly. Without this, importing the
// module — which the test suite does — would fire the CLI as a side effect.
const isEntryPoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) {
  main().catch((error: unknown) => {
    log(`resummarize crashed: ${(error as Error).stack ?? String(error)}`);
    process.exitCode = 1;
  });
}
