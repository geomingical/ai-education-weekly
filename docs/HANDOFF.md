# AI 教育週報 — handoff

Status as of 2026-08-18. Everything below has been run and verified locally.
Nothing has been pushed to GitHub and nothing is deployed.

## What this is

A bilingual (zh-TW / en) static site that collects news about **AI in education**
from a hand-picked list of feeds, files each story under its ISO week, writes a
Chinese headline and summary with a language model, and publishes automatically.

The architecture is copied from `AI_free_source`: Astro static site, pure
framework-free domain logic in `src/domain/`, JSON data validated by Zod at build
time, a separate `pipeline/` that writes that JSON, and GitHub Actions that are
all inactive until deliberately switched on.

The central record is different. `AI_free_source` is built around an **offer** and
its verification lifecycle. This is built around a **story** and its **issue** —
which week it belongs to, which source it came from, and which words are the
model's rather than the source's.

## The four decisions that shaped it

Ming chose these on 2026-08-18:

| Decision | Choice | Consequence |
| --- | --- | --- |
| Publishing | Control the sources, then publish automatically | No PR review step. The source registry is the whole editorial gate, so the ingest rules are strict. |
| Summaries | Model-written Traditional Chinese | Needs an API key. Original headline, source, and link always stay visible beside the machine text, and every machine line is badged. |
| Shape | Weekly issue + filterable archive | `/` is this week, `/weekly/<issue>/` is any week, filters work within an issue. |
| Languages | zh-TW + en | Typed message catalog; a missing translation is a compile error. |

The auto-publish plus machine-summary combination carries a real risk: a model
that misreads a story publishes that mistake unread. The mitigations are the
visible badge, the always-present original headline, the link, and the fact that
a rejected model reply falls back to the source's own words rather than guessing.

## How a week runs

```
npm run pipeline:run          # a normal week (8-day window)
npm run pipeline:dry          # same, but writes nothing
npx tsx pipeline/src/run.ts --since 45   # backfill the archive

npm run pipeline:resummarize                              # fill in missing Chinese summaries
npx tsx pipeline/src/resummarize.ts --dry-run --limit 6    # try the model on six first
```

Load the key first: `set -a; . ./.env; set +a`.

1. **Read the registry.** Only `active` sources with a `feedUrl` are fetched.
2. **Fetch**, through `pipeline/src/fetcher.ts` — https-only, allowlisted hosts,
   every redirect hop re-validated, private/internal IPs blocked, size and time
   capped. Copied from `AI_free_source`, where it was written for the same job.
3. **Parse** RSS, RSS 1.0/RDF, Atom, or JSON Feed. A broken feed is an outcome in
   the report, never an exception that ends the run.
4. **Gate** (`pipeline/src/ingest.ts`). An item must have a title, an https link
   on the source's own domain, a real publication date inside the window and not
   in the future, and — for `keyword` sources — both an education term and an AI
   term. Then it must be new, and must fit under the source's per-run cap.
5. **Summarize** (best effort). Batches of six; a reply is accepted only if it is
   JSON with exactly one validated entry per item sent. Anything else discards
   the whole batch and those stories fall back to the source's own summary.
6. **Merge** into `src/data/stories.json`. Additive: an existing record is never
   rewritten, so a re-run cannot change what a reader already saw.
7. **Report** one JSON document on stdout — per-source status, accepted counts,
   and a rejection-reason histogram.

Set `AI_EDU_API_KEY` (or `NVIDIA_API_KEY`) to enable step 5. Without it the
pipeline still runs and stories publish with the source's verbatim summary; the
run report says so in `warnings`. `pipeline:resummarize` fills those in later —
it is the only thing that rewrites an existing record, and it can only write the
two Chinese fields. Title, summary, URL, date, and issue are untouchable, because
they are the reader's check on the machine.

## The model

`pipeline/config/agents.json` — `nvidia/nemotron-3-ultra-550b-a55b` on NVIDIA's
OpenAI-compatible endpoint. About 32 seconds per batch of six, so a normal week
is well under a minute and the 66-story backfill took roughly six.

Two smaller models on the same endpoint were tried and rejected:
`nemotron-3.5-lightning-30b-a3b` and `nemotron-3-super-120b-a12b`. Both are
reasoning models that emit a long chain of thought first and never reached the
JSON inside the token budget — 0 of 6 usable. `extractJsonEnvelope` now finds the
JSON after a preamble or inside a code fence, so a model that merely *starts*
with prose is fine; one that never finishes still is not. If you swap models,
run `resummarize --dry-run --limit 6` and read the output before committing.

### How the reliability problem was actually solved

The first full backfill summarized only 24 of 66 stories. The obvious diagnosis
— free-tier rate limiting under sustained load — was wrong, and a cross-model
review (`docs/research/SUMMARIZER_RETRY_REVIEW.md`) caught it: three timeouts
consumed 180 of the 435 seconds, leaving the other eight calls at 31.9 seconds
each, which is the same as an isolated healthy call. There was no slowdown to
back off from.

Adding observability first — `finish_reason`, token usage, HTTP status, request
id, per-attempt duration — is what found the real cause, in three measured steps:

1. **Reasoning was on by default.** Nemotron 3 is a reasoning model; the same
   trivial request spent 113 completion tokens by default and 29 with
   `reasoning_effort: "none"`. Turning it off helped, but did not fix it.
2. **The rejected replies were not truncated.** Every one came back
   `finish_reason: "stop"` with 700–950 tokens — complete answers. Inspecting
   them showed correct Chinese content inside **broken array punctuation**: a
   missing comma between elements, an array closed early then continued, a
   doubled bracket. A classic delimiter failure, not a content failure.
3. **Constrained decoding fixed it, but only with a length bound.** The endpoint
   rejects `nvext.guided_json` and accepts `response_format` with a
   `json_schema`. A schema without `minItems`/`maxItems` made things *worse* —
   the model satisfied it with one or two items and replies collapsed to ~130
   tokens. Pinning the array to exactly the batch length was the fix.

Result: **18 of 18 on the final run, zero fallbacks, zero retries needed.** All
66 stories now carry a machine headline and summary.

The retry policy stayed in anyway, because 503s from this endpoint are real and
were observed recovering on the second attempt. It is resilience, not the fix.

### Retry policy

Owned by `summarizeAll`, not the transport: only the summarizer knows whether a
200 response actually passed validation, and two retry loops would silently
become four wire calls per batch. The transport makes exactly one attempt and
returns typed failure data (`kind`, `status`, `retryAfterMs`, `requestId`).

- Two attempts per batch, six retries per run, 25-minute wall-clock budget.
- Retries timeouts, network errors, 408, 429, 500, 502, 503, 504, a malformed
  body, empty content, and **one** shape rejection. Does not retry 400/401/403/
  404/422/501/505, and never retries a per-entry content rejection.
- Attempt timeouts 75s then 120s — the longer second deadline tests whether a
  request was stalled rather than dead.
- 3s between batches; 10s + 0–5s jitter before a retry; a server `Retry-After`
  wins when it asks for longer, capped at 120s.
- Timing is injected, so all of it is tested without the suite ever sleeping.

### One thing the first live run changed

The validator originally discarded a whole batch of six if any single field
failed a check — and the first real call lost six good summaries to one
43-character title (`Microsoft 365 Copilot 推出 Study and Learn 功能`, over the
then-40-character limit). Validation is now two-level:

- **Shape** problems — not JSON, wrong entry count, a duplicate or out-of-range
  index — still discard the whole batch, because the index-to-story mapping
  cannot be trusted and nothing in the reply is usable.
- **Content** problems — empty, over-length, or containing a URL or markup —
  drop only that one entry. Its story falls back to the source's own words; its
  neighbours keep their summaries.

That is not a weakening of the injection defence. An entry that emits a URL or a
tag is still refused; it just no longer takes five innocent summaries with it.

## The source registry

`src/data/sources.json` — 33 sources, 15 active. Built from the verification pass
in `docs/research/SOURCE_CANDIDATES.md`, where every URL was actually fetched.

**Active (15):** ChatGPT for Education Newsletter, OpenAI News, Microsoft
Education Blog, Khan Academy Blog, EdSurge, Education Week, Inside Higher Ed,
three arXiv feeds, MIT News Education, Digital Promise, AI4K12, Hugging Face
Blog, PanSci.

**Inactive (18), and why it matters:**

- **No feed exists** — Google for Education, Claude for Education, UNESCO, OECD,
  European Commission (AI Act and Digital Education Action Plan), US Department
  of Education, Taiwan 教育部, Taiwan 數位發展部, Stanford HAI, TeachAI, The
  Batch, 1EdTech, Times Higher Education, THE Campus. Reaching these would need
  HTML polling, which is not built.
- **Robots.txt forbids polling** — GOV.UK DfE (a valid Atom feed exists at
  `/search/all.atom`, but robots disallows `/search/all*`) and *Computers &
  Education: AI* (its RSS host says `Disallow: /`). Both left off deliberately.
- **Dormant** — MIT Teaching Systems Lab; its newest ten posts are from 2020–21.

**The biggest gap is Taiwan.** 教育部 and 數位發展部 are the primary sources for
Taiwanese school and university AI policy, and neither publishes a feed. Nothing
Taiwan-specific reaches the site today except whatever PanSci happens to write.

## What the first real collection produced

One backfill run over 45 days: **66 stories across 7 issues (2026-W28 … W34)**.

| Source | Stories |
| --- | --- |
| arXiv (three feeds combined) | 35 |
| EdSurge | 13 |
| ChatGPT for Education Newsletter | 10 |
| OpenAI News | 4 |
| Microsoft Education | 2 |
| MIT News Education, Inside Higher Ed | 1 each |

Two things worth knowing about that mix:

- **Research dominates.** arXiv is over half the volume even after the per-source
  caps were tightened. Lower `maxPerRun` on the three arXiv entries if a week
  reads too much like a paper dump.
- **The news feeds are genuinely quiet.** Over 45 days, Khan Academy, Digital
  Promise, EdWeek, and PanSci contributed nothing — not because the filter is
  broken, but because none of them published an AI-and-education story in that
  window. Spot-checking EdSurge confirmed the filter discriminates correctly: it
  kept every AI story and dropped every non-AI one.

## Real behaviours worth knowing

- **Education Week ships future-dated items.** The research pass found entries
  dated weeks ahead, and the live run confirmed three. The gate rejects anything
  more than six hours past now, so they cannot create an issue for a week that
  has not happened.
- **Re-running the same window admits more.** An already-published item is
  rejected as a duplicate *before* the cap, so it does not consume a cap slot.
  That is what a weekly schedule needs, but it means backfilling twice at the
  same `--since` adds another capful. Backfill once.
- **The OpenAI education newsletter redirects.** `openaiforeducation.substack.com`
  301s to `edunewsletter.openai.com`. `officialDomains` is `openai.com`, so the
  fetcher follows it. Allowlisting `substack.com` instead would have opened the
  fetcher to every publication on Substack.

## Testing

`npm run verify` runs all three layers: 425 unit tests, a production build, and
42 browser tests. Coverage of the pure logic is above the 80% threshold the
config enforces.

The unit suite covers ISO-week edge cases (including the year-boundary rule that
puts 2027-01-01 in 2026-W53), filtering and URL round-trips, every schema rule,
feed parsing across four formats, the relevance classifier in English and
Chinese, every ingest rejection reason, the SSRF guard, and the prompt-injection
defences — including that a forged `</item>` in a feed title cannot escape the
frame the summarizer wraps it in.

`tests/unit/guards.test.ts` mechanically enforces the rules a reviewer would
otherwise have to remember: no uncommented automatic workflow trigger, every
source carrying a reuse note and a verification date, every inactive source
explaining itself, bilingual completeness, no colour literals in component CSS,
and no `:global(` outside the layout.

## Not built, on purpose

- **HTML polling.** Every feedless source above would need it. It is the single
  highest-value thing to add next, and the only way Taiwan gets covered.
- **Deduplication across sources by content.** Two outlets covering the same
  announcement produce two stories. Only identical URLs collapse today.
- **Per-story pages.** Rows link straight to the original.
- **Search across issues.** Filters work within one issue only.
- **Dark mode, animations, a UI framework, analytics.**

## Known rough edges

- **Source `notes` are English-only** on a bilingual site. They carry operational
  detail (why a source is inactive, which robots rule applies) rather than
  reader-facing copy, so they were left untranslated rather than machine-translated.
  Worth a decision.
- **`region` comes from the source, not the story.** A US outlet covering an EU
  policy is tagged US.
- **Topic tags are keyword-matched**, so they are approximate. They are filters,
  not claims.
- **A failed summarization is not re-attempted on a later day.** The in-run
  retry policy covers a transient failure, but if a whole run degrades, those
  stories publish with the source's own summary and stay that way until someone
  runs `pipeline:resummarize`. Worth wiring into the workflow once the schedule
  is live and its real failure rate is known.
- **Batch size was deliberately not tuned.** Six is what the evidence covers.
  Changing it now would confound the next measurement.

## Before this goes live

Everything below is a human checkpoint (see `CLAUDE.md`) and none of it is done:

1. Create the GitHub repository and push.
2. Add the model key as the `AI_EDU_API_KEY` repository secret — it lives in
   `.env` locally as `NVIDIA_API_KEY` and is gitignored. Then run the weekly
   workflow once manually and read the run summary before trusting it.
3. Decide the domain. `astro.config.mjs` currently says
   `https://ai-edu.aimingdata.com`; `public/robots.txt` repeats it. Both need
   changing together, and a `public/CNAME` needs adding, if the domain differs.
4. Enable GitHub Pages and run the deploy workflow manually.
5. Only then uncomment the `schedule:` line in
   `.github/workflows/weekly-digest.yml`. That is the moment this starts
   publishing to the public internet without anyone reading it first.
