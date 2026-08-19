# AI 教育週報 — handoff

**Live at https://geomingical.github.io/ai-education-weekly/**, published from
`geomingical/ai-education-weekly` (public), running every Monday at 09:00 Taipei
time. Deployed 2026-08-19.

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
2. **Fetch the feed**, through `pipeline/src/fetcher.ts` — https-only,
   allowlisted hosts, every redirect hop re-validated, private/internal IPs
   blocked, size and time capped. Copied from `AI_free_source`, where it was
   written for the same job.
3. **Parse** RSS, RSS 1.0/RDF, Atom, or JSON Feed. A broken feed is an outcome
   in the report, never an exception that ends the run. Each item yields **two**
   pieces of text: a short excerpt (`description`) and, when the publisher
   shipped one, the whole post body (`content:encoded`). They have completely
   different fates — see step 5.
4. **Gate** (`pipeline/src/ingest.ts`). An item must have a title, an https link
   on the source's own domain, a real publication date inside the window and not
   in the future, and — for `keyword` sources — both an education term and an AI
   term. Then it must be new, and must fit under the source's per-run cap.
5. **Get the article text** (`pipeline/src/article.ts`), and this is the step
   with the sharpest rule attached:
   - If the feed already carried the body, use it. Four of the registry's feeds
     ship 7,000–8,400 characters in `content:encoded`; fetching their article
     pages as well would ask their servers for what they already gave.
   - Otherwise fetch the article page and extract the readable body with
     Readability (Firefox's reader-mode extractor), which drops navigation,
     ads, and footers. A paywall, a cookie wall, or a script-rendered shell
     yields nothing usable — that is an outcome, and the story is summarized
     from its excerpt instead.
   - Article fetches are paced **per host**, because Crawl-delay is a rule about
     one server rather than a global speed limit.
   - **The article text is never stored and never published.** It is handed to
     the model once and dropped. `src/data/stories.json` keeps the short
     excerpt, the machine summary, and the link — nothing else.
6. **Summarize** (best effort). One story per call, so a rejected reply can only
   ever cost that one story. A reply is accepted only if it matches the
   requested shape; see the retry policy below.
7. **Merge** into `src/data/stories.json`. Additive: an existing record is never
   rewritten, so a re-run cannot change what a reader already saw.
8. **Report** one JSON document on stdout — per-source status, accepted counts,
   and a rejection-reason histogram.

### Relevance is now judged by model, with the keyword rules behind it

`pipeline/src/classify-agent.ts` asks a model, in batches of twelve, whether
each candidate is about AI in education and which topics it carries. The
keyword rules in `classify.ts` remain as the fallback for when no provider
answers, so a model outage degrades judgement rather than stopping the week.

**Why.** The keyword gate was wrong twice in one day, in both directions, and
the failures were not tuning errors — they are what word-matching does with
words that mean two things (`assessment` as model evaluation, `university` in a
biography). It also lifts a limit unrelated to quality: the term lists were
English and Chinese only, so a Finnish or Estonian feed would have been filtered
to nothing however relevant.

**Why it is affordable.** The date window runs first and does most of the work:
2,463 feed items collapse to about 405 over thirty days, roughly 108 in a normal
week — a handful of batched calls beside the summarization already happening.

**The candidate's body is sent when the feed carried one**, free, no extra
request. Without it the classifier inherits exactly the blind spot it was meant
to fix: a side-by-side test on seven known-hard stories had model and keywords
tied at 6/7, failing the same one. With the body: model 7/7, keywords 6/7 — and
the model's topic tags were markedly better.

**The cap moved after relevance.** It now counts stories worth publishing rather
than stories that happened to be checked first, so a feed of fifty irrelevant
items no longer consumes the budget before a relevant one is reached.

This gate decides whether content is PUBLISHED, not just how it is described, so
it carries the same injection defences as the summarizer — framed and sanitized
input, bounded size, structured output validated against the exact request.

### The keyword rules, and how they were got wrong twice

The gate asks one question: is this story about AI in education? It reads the
headline and excerpt as statements of subject, and the article body only by
weight — a long article touches many things in passing.

    headline says both            -> accept
    otherwise, per missing signal -> require it in the body:
                                     AI >= 3 mentions, education >= 8

Both thresholds are measured, and both corrections came from live runs:

1. **Checking only the headline and excerpt missed real stories.** The excerpt
   is the first ~400 characters, and four of ten OECD posts opened on teachers
   while being about AI. Measured across five full-text feeds: articles genuinely
   about AI mention it 8 to 44 times; a passing name-drop mentions it once.
2. **Then the fix over-corrected, because it was asymmetric.** Requiring AI to
   be substantive while accepting one education word anywhere is fine for a
   general publisher and useless for an AI company, where the AI test is free.
   A live run let in "Introducing Claude Sonnet 5" — triggered by `assessment`
   twice, meaning model evaluation — and an executive appointment triggered by
   `school`, `university` and `academia` appearing once each in a biography.
   Genuine education articles score 14 to 85; those false positives scored 2 to
   4.
3. **And "machine learning" was counting as a mention of learning.** A test
   caught it. AI compounds that embed an education word are stripped before the
   education terms are counted.

Each of the three is pinned by a test named after the story that exposed it.

### Why the flow looks like this

The original design summarized from the feed's `description` alone. Measuring it
showed why that was not enough: arXiv ships a full abstract (≈400 characters,
which the excerpt cap was silently truncating), but EdSurge's description
averages 88 characters and OpenAI's education newsletter 130. For 23 of 66
stories the model had a one-line teaser to work from, so it was rephrasing a
headline rather than summarizing an article.

The obvious fix — fetch every article page — turned out to be mostly
unnecessary. Four of the eight thin sources already ship the whole body in
`content:encoded`; the parser was simply preferring `description` because it
came first in a `firstNonEmpty(...)` call. Fixing that field preference covered
26 stories at zero extra cost. Article fetching remains as the fallback for the
handful of feeds that really do ship only a teaser.

Set `AI_EDU_API_KEY` (or `NVIDIA_API_KEY`) to enable step 5. Without it the
pipeline still runs and stories publish with the source's verbatim summary; the
run report says so in `warnings`. `pipeline:resummarize` fills those in later —
it is the only thing that rewrites an existing record, and it can only write the
two Chinese fields. Title, summary, URL, date, and issue are untouchable, because
they are the reader's check on the machine.

## The model, and its fallback

`pipeline/config/agents.json` lists providers in order. They are tried in that
order, and the second is only ever called when the first produces nothing.

| | endpoint | model | JSON mode |
| --- | --- | --- | --- |
| primary | `integrate.api.nvidia.com` | `nvidia/nemotron-3-ultra-550b-a55b` | `json_schema` |
| fallback | `api.deepseek.com` | `deepseek-v4-flash` | `json_object` |

**Why a second vendor rather than falling back to no summaries.** NVIDIA's free
tier returned 503 repeatedly during development, including mid-run. Degrading to
source-verbatim text would cost a whole week's Chinese summaries for what is
one vendor's bad afternoon. A live failover test — a deliberately invalid NVIDIA
key — handed over in 204ms and DeepSeek finished the story in 2.7 seconds.

**The two are not equivalent, and the difference matters.** NVIDIA accepts
`response_format: json_schema`, which constrains decoding to our exact shape and
is what took summarization from 24/66 to 66/66. DeepSeek rejects `json_schema`
outright ("This response_format type is unavailable now") and offers only
`json_object`. So the fallback leans on the other three defences instead:
preamble-tolerant JSON extraction, per-entry validation, and one retry. Tested
working, but with a weaker guarantee — which is the right trade for a fallback
and the wrong one for a primary.

Validation is identical for both. That is what makes a weaker provider safe to
fall back to, and it is asserted by a test.

Keys come from the environment, first match wins:
`AI_EDU_API_KEY` then `NVIDIA_API_KEY`; `AI_EDU_FALLBACK_API_KEY` then
`DEEPSEEK_API_KEY`. A provider with no key is skipped silently — running with
only one configured, or none, is a normal local state.

About 32 seconds per NVIDIA call at batch size six; one story per call now, at
roughly 2-4 seconds each plus 8 seconds of pacing.

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

- One story per call, two attempts each, six retries per run, 25-minute
  wall-clock budget. A backfill that runs out of budget is finished by running
  `pipeline:resummarize` again — it is idempotent.
- Retries timeouts, network errors, 408, 429, 500, 502, 503, 504, a malformed
  body, empty content, and **one** shape rejection. Does not retry 400/401/403/
  404/422/501/505, and never retries a per-entry content rejection.
- Attempt timeouts 75s then 120s — the longer second deadline tests whether a
  request was stalled rather than dead.
- 8s between model calls; 10s + 0–5s jitter before a retry; a server
  `Retry-After` wins when it asks for longer, capped at 120s. Article pages are
  paced separately, 10s per host.
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

**Active (23):** ChatGPT for Education Newsletter, OpenAI News, **Google for
Education**, Microsoft Education Blog, Khan Academy Blog, EdSurge, Education
Week, Inside Higher Ed, three arXiv feeds, MIT News Education, Digital Promise,
AI4K12, Hugging Face Blog, PanSci, five policy sources (**GOV.UK Department
for Education**, **OECD Education and Skills Today**, **European Commission
Education and Training**, **Education Estonia**, **e-Estonia**), plus two
indexed through a sitemap:
**Anthropic News** and **DeepLearning.AI The Batch**.

### The policy gap, and closing it

Until 2026-08-19 the registry had **no active policy source at all**. Twenty-three
of ninety-four stories carried a `policy` tag, but every one had reached the site
second-hand, through an arXiv paper or a news outlet. No government or
inter-governmental body spoke on it directly — a real hole for a product about
AI in education, where what ministries mandate is what schools end up doing.

Three feeds closed it, all verified on 2026-08-19:

- **GOV.UK Department for Education** — and this corrected an earlier decision.
  The feed found in the first pass sat under `/search/all*`, which robots.txt
  forbids, so refusing it was right. The department's own `.atom` feed is not
  covered by any Disallow rule; the full robots.txt was re-read to confirm.
- **OECD Education and Skills Today** — OECD's official education blog, and the
  way in after `oecd.org` itself returned 403 to every request. Its feed carries
  full post bodies.
- **European Commission Education and Training** — the education directorate's
  own feed. Low and irregular volume.

All of them run in `keyword` mode: their output is education policy generally,
and only a slice of it touches AI.

Their first run produced nothing, for three different and unalarming reasons:
OECD's relevant posts were dated February and fell outside the collection
window; half the Commission's feed was outside it too; and GOV.UK's twenty
items were genuinely administrative — data collection guides and funding
agreements, none about AI. Policy sources are low-volume by nature. They earn
their place on the weeks something happens, not every week.

### Reaching a non-English-speaking country

Finland was checked first and does not work. Seven routes were tried on
2026-08-19: the Ministry (`okm.fi`) returns 403; the National Agency for
Education publishes no feed, and its sitemap is paginated across six-plus
unsorted pages — one page alone spans 2019 to 2026, so there is no reliable way
to ask it for the last week — and is 68% Finnish, 26% Swedish, 6% English; Yle's
English feed carried zero education and zero AI items; Sitra's feed is circular
economy and labour migration; Elements of AI is a course site, not a news
source; HundrED and Aalto publish nothing fetchable.

Estonia works, and for a specific reason: it maintains an English-language
education portal. **Education Estonia** carried ten items of which all ten were
about education and three explicitly about AI, with full post bodies in the
feed. Estonia's AI Leap programme puts AI tools into every upper-secondary
school, which makes this a first-party account rather than commentary.
**e-Estonia** is the broader digital-state showcase and covers the same
programmes from outside.

The lesson generalises: the reachable route into a non-English-speaking
country's education policy is its own English-language outreach site, not its
ministry and not its national broadcaster. Both of those were dead ends in
Finland and, for the broadcaster, in Estonia too — ERR News carried 50 items
with zero touching both education and AI, so it was left out.

A second constraint sits behind this. `pipeline/src/classify.ts` knows English
and Chinese terms only, so a Finnish or Estonian-language feed would be filtered
to nothing even if it could be fetched. Extending the vocabulary is the
prerequisite for any source that publishes in its own language.

Stanford HAI was tried through its sitemap and withdrawn the same day: the
sitemap is excellent, but its article pages serve 164KB of HTML containing seven
`<p>` tags, and Readability extracts 58-103 characters from them. A live run
confirmed 7 of 7 pages unreadable. Reading it would need a headless browser —
a dependency and a fragility this project does not want — so it costs seven
requests a week for nothing and is better left off.

### Sitemap sources

Some publishers worth watching simply do not publish a feed. Rather than scrape
a listing page with CSS selectors — which breaks on the next redesign — those
sources are read through `sitemap.xml`, a published standard with a published
`<lastmod>` date field. `pipeline/src/sitemap.ts` filters by URL section, then
by the date window, then caps, and only then fetches each surviving page and
reads it with the same Readability extractor the article stage uses.

Two things follow from a sitemap carrying no titles and no bodies:

- Every candidate costs one page fetch, so the caps on these sources are small.
  Anthropic spends about eight fetches in a normal week; in the week this was
  built, the relevance filter correctly rejected all eight, because Anthropic
  published watermarking, a model launch, an executive hire, and a partnership,
  and no education news at all. That is the filter working, and it is the price
  of a first-party source with no feed.
- A cheap URL-slug pre-filter was considered and rejected. It would save
  perhaps a minute a week and could silently drop the one story that matters —
  the wrong trade on a first-party source.

**Google's education feed was found on a second look.** The first research pass
tested `/feed` and an old Blogger-style path and concluded there was none; the
working pattern is `<category-path>/rss/`. It is a genuine education-category
feed, so it runs in `always` mode.

**Anthropic genuinely has none.** Every conventional path 404s and no page
declares one — rechecked on 2026-08-19 via feed autodiscovery, which is the
definitive test. Its robots.txt says `Allow: /` and advertises the sitemap.

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
Taiwanese school and university AI policy. Neither publishes a feed, and the
sitemap route does not rescue them either: `edu.tw/sitemap.xml` lists 105 URLs
with **zero `<lastmod>` dates**, so there is nothing to filter a week by, and
several of its entries are malformed (`edu.tw/https://depart.moe.edu.tw/…`).
Covering Taiwan needs listing-page parsing — the fragile kind. Nothing
Taiwan-specific reaches the site today.

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

- **HTML listing polling.** Sitemaps covered the feedless sources that publish
  one. Taiwan's 教育部 and 數位發展部 publish neither a feed nor a usable
  sitemap, so covering them still needs listing-page parsing — the fragile kind,
  with CSS selectors that a redesign breaks. Still the only route to Taiwanese
  policy news.
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
- **A country is its own region, not folded into its bloc.** Estonian stories
  are tagged `EE`, and the region filter matches a story's own region plus
  `GLOBAL` — so selecting `EU` does not surface them. Precise today; it becomes
  a region hierarchy only if the list grows enough to need one.
  `tests/unit/format.test.ts` asserts every region an active source can produce
  has a label in both languages and appears in the filter, so adding a country
  cannot silently leave a raw code like `EE` on the page.
- **Topic tags are keyword-matched**, so they are approximate. They are filters,
  not claims.
- **A failed summarization is not re-attempted on a later day.** The in-run
  retry policy covers a transient failure, but if a whole run degrades, those
  stories publish with the source's own summary and stay that way until someone
  runs `pipeline:resummarize`. Worth wiring into the workflow once the schedule
  is live and its real failure rate is known.
- **A backfill is slow by design.** One model call per story plus per-host
  article pacing means roughly 15–25 minutes for 66 stories. A normal week is a
  handful of stories and finishes in a couple of minutes.
- **Article extraction will fail on some pages** — paywalls, cookie walls, and
  script-rendered shells. Those stories fall back to the feed excerpt, which is
  the pre-existing behaviour, so a failure costs quality rather than coverage.
- **Articles are all fetched before any summarizing starts.** If a run hits its
  wall-clock budget partway through summarizing, the pages fetched for the
  remaining stories were read for nothing and will be read again next time.
  Harmless for a normal week (a handful of stories, minutes); worth interleaving
  the two stages if backfills become routine.

## Deployment

Done on 2026-08-19, in this order — the order matters, because each step proves
the next one is safe:

1. Public repository `geomingical/ai-education-weekly`. Public because GitHub
   Pages only serves private repositories on a paid plan, and because the site's
   content is public by design. Nothing sensitive is committed; `.env` is
   ignored and was verified absent from the tracked tree before the first push.
2. `AI_EDU_API_KEY` set as a repository secret from the local `.env`.
3. Pages enabled with `build_type: workflow`.
4. Deploy workflow run manually — it failed the first time, on a real gap:
   `astro check` type-checks the test and pipeline sources, which use Node
   built-ins, and `@types/node` was only present transitively. It passed
   locally and produced 43 errors on a clean CI install. Declaring it fixed
   both.
5. The weekly digest workflow run manually, end to end on CI: tests, collection,
   summarization, build verification, a commit of four new stories, deploy.
6. **Only then** the `schedule:` trigger was uncommented.

### Changing the domain later

`astro.config.mjs` sets `base: '/ai-education-weekly'` because a GitHub Pages
project site lives under a sub-path. `src/lib/paths.ts` is the only place that
knows this — `src/domain/locale.ts` stays pure and returns site-root-relative
paths. Moving to `ai-edu.aimingdata.com` means: set `base` back to `'/'`, set
`site` to the domain, update `public/robots.txt`, add `public/CNAME`, add the
DNS record, and update the Playwright base URLs. No component changes.

### Pausing the schedule

Comment out the two `schedule:` lines in
`.github/workflows/weekly-digest.yml`. `workflow_dispatch` keeps working for
manual runs. `tests/unit/guards.test.ts` allows a schedule in that one file and
nowhere else, and still forbids any `push` or `pull_request` trigger anywhere —
publishing on every commit is a different thing from a weekly digest.
