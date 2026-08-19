# Summarizer retry design review

Date: 2026-08-19

## Recommendation in one paragraph

Keep validation exactly as it is and keep batches at six for the first reliability change. Make `transport` perform exactly one HTTP attempt and return structured failure metadata; put the retry policy in `summarizeAll`, because only that layer can distinguish a valid response, a whole-batch shape rejection, and per-entry content rejection. Allow at most two attempts per batch, with a run-wide cap of six retries and a 25-minute summarization budget. Retry timeouts, network failures, HTTP 408, 429, 500, 502, 503, and 504, plus one whole-batch shape rejection. Use attempt timeouts of 75 seconds then 120 seconds, a three-second gap between completed batches, and a retry delay of 10 seconds plus 0–5 seconds injected jitter unless a valid `Retry-After` asks for longer (cap it at 120 seconds). Before treating retry as the main fix, explicitly disable this model's high-reasoning mode for this summarization task and record finish reason, latency, status, and safe response metadata; the current 2,000-token ceiling combined with the model's documented default high reasoning is a plausible cause of truncated, shape-invalid replies.

This is a conservative starting policy, not a claim that these constants are optimal. The production run is one observational sample and does not include per-request timing, batch position, response `finish_reason`, raw rejected shape, or headers.

## What the current evidence actually says

Direct observations:

- One isolated batch of six completed 6/6 in 32 seconds.
- The 66-story run made 11 sequential calls, returned 24 accepted summaries, and took 435 seconds.
- Three calls timed out at the client's fixed 60-second limit, three returned a 200-class body whose shape validation failed, and one returned HTTP 503.
- `summarizeAll` catches a transport that violates its contract by throwing, and otherwise converts transport failures and validation failures into fallbacks. `createHttpTransport` also catches fetch, parsing, timeout, and HTTP failures. Those two safety nets are worth preserving.
- A shape failure discards all six entries; a content failure discards only the offending entry. That boundary is sound and security-relevant.

Inference, with an important correction to the proposed diagnosis:

- The timings do **not** establish that all calls progressively slowed under sustained sequential load. Three timeouts consume 180 seconds. The remaining eight calls therefore consumed about 255 seconds, or **31.9 seconds each**, almost exactly the isolated batch's 32 seconds. The evidence supports intermittent stalls or queueing under the sustained run; it does not show a general latency increase. Per-attempt timings and batch order are needed to establish a trend.
- The seven failed batches account exactly for 42 fallbacks. There is no evidence here of per-entry content rejection in this run.
- Shape rejection is not necessarily a load symptom. NVIDIA documents this model as a reasoning model whose hosted API defaults `reasoning_effort` to `high` and whose reasoning budget defaults to 16,384 tokens. This repository sends `max_tokens: 2000` but no reasoning control. A response that spends its budget reasoning and is cut off before completing the JSON can look exactly like a shape failure. The response's `finish_reason`, usage fields, and a bounded diagnostic classification of the rejected reply are currently discarded, so this hypothesis is untested. See NVIDIA's [Nemotron 3 Ultra inference API](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-ultra-550b-a55b-infer) and [model page](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-ultra-550b-a55b).

## 1. Retry scope and classification

### Put policy in `summarizeAll`, keep one wire attempt in `transport`

I would not put an opaque retry loop inside `createHttpTransport`. The transport does not know whether a successful HTTP reply passed batch validation, and the summarizer should apply one budget and one pacing policy across both transient HTTP failures and model shape failures. Hidden transport retries would also make call counts, elapsed time, and quota use harder to test and report.

The boundary should be:

- `transport`: one attempt; never throws; applies the supplied timeout; returns either content plus response metadata, or a structured error such as `{ kind, status, retryAfterMs, requestId, message }`.
- `summarizeAll`: owns attempts, delays, run budget, pacing, validation, error aggregation, and final fallback; also never throws, including if injected timing functions throw.

Do not classify retryability by parsing today's human-readable error strings. The current `ChatResponse` has erased the HTTP status, response headers, and distinction between timeout, other network failure, malformed success body, and empty content. Preserve those as typed data while retaining a safe error message for logs.

### Retry matrix

| Outcome | Retry? | Reason |
|---|---:|---|
| Client timeout | Once | The server may have queued or stalled; three observed timeouts make one second chance worthwhile. |
| Network reset/DNS/transient fetch failure | Once | Often transient, but an unbounded retry could duplicate costly generation. |
| HTTP 408 | Once | Explicitly transient request timeout. |
| HTTP 429 | Once, honour `Retry-After` | This is the clearest pacing signal. If the requested wait cannot fit the run budget, fall back. |
| HTTP 500, 502, 503, 504 | Once | Common transient server/gateway failures; 503 occurred in the real run. |
| Other 5xx | No by default | `501` and `505` are not plausibly repaired by delay. An allow-list is clearer than "all 5xx". Add a status later if evidence warrants it. |
| HTTP 400, 401, 403, 404, 409, 413, 422 | No | Authentication, permission, request, model, or payload errors are unlikely to change on an identical retry. |
| Malformed JSON HTTP body / empty assistant content | Once | A hosted inference response can be transiently incomplete; one retry is bounded. Log it distinctly from validation shape failure. |
| Whole-batch shape rejection | Once | At temperature 0.2 and with model/server nondeterminism, an identical prompt can produce a valid second response. One attempt is a reasonable recovery probe. Repeated failure is evidence of a batch-specific or configuration problem, so stop after that. |
| Per-entry content rejection | No | The reply is already safely mapped and useful neighbours are retained. Retrying the whole batch spends quota and may replace accepted text merely to rescue one entry. |

Retrying a shape rejection is therefore sensible **once**, but it is not evidence that validation should be relaxed. Record whether the second attempt succeeds. If shape retries rarely recover, remove that retry or split only those batches in a later, evidence-backed change.

## 2. Backoff, pacing, and limits

Recommended initial constants:

- Maximum attempts per batch: **2** (one initial attempt plus one retry).
- Run-wide retry cap: **6**. Once exhausted, remaining failed batches fall back normally. This bounds free-tier and wall-clock exposure while covering most of the seven failures seen in this run.
- Inter-batch delay: **3 seconds** after a batch is finished, before starting the next batch, including after a successful batch; do not sleep after the final batch.
- Ordinary retry delay: **10 seconds + uniform 0–5 seconds jitter**.
- `Retry-After`: use the larger of the ordinary retry delay and the valid server value, capped at **120 seconds**. Support both delta-seconds and HTTP-date forms. Ignore invalid or negative values.
- Summarization wall-clock budget: **25 minutes**. Before a sleep or attempt, check whether its maximum planned duration fits. If not, return fallbacks for that batch and all unstarted batches. This is a returned degraded result, never an exception.

With 11 batches, fixed pacing costs only 30 seconds. Against a 435-second run that is a small insurance premium, although the existing 32-second service time already naturally spaces request starts. I would not choose a 30–60 second success delay without evidence: it would add 5–10 minutes even when NVIDIA is healthy. The three-second value is deliberately modest; latency and headers should decide whether it stays.

With only one retry, elaborate exponential backoff has little value. The 10–15 second delay is enough to avoid an immediate hammer after a stall without pretending we know the free-tier recovery window. If later evidence justifies three or more attempts, use capped exponential backoff then; do not add attempts merely to make the formula useful.

Jitter is still useful because GitHub schedules many users on clock boundaries. Determinism is preserved by injecting `sleep(ms)`, `random()`, and preferably `now()` into the orchestration options. Tests can use a sleep spy that resolves immediately and a fixed random value. Production defaults can use `setTimeout`, `Math.random`, and `Date.now`.

## 3. Timeout

A flat 60 seconds is too close to the observed 32-second healthy latency for a very large shared free-tier model: it permits less than a 2× slowdown. Use:

- Attempt 1: **75 seconds**.
- Attempt 2: **120 seconds**.

The longer second deadline tests the queueing/stall hypothesis instead of repeating the same cutoff. Do not use an unbounded timeout, and do not let every attempt inherit 120 seconds: healthy failure detection still matters. The run-wide 25-minute budget prevents the worst case from becoming 11 × (75 + delay + 120) seconds.

One caveat: an abort does not prove the provider stopped generation, so a timeout retry can consume two free-tier generations. That is another reason for one retry and a global retry cap.

## 4. Batch size

Keep **six** initially. Do not mix a batch-size experiment into the first retry/reasoning/observability change.

- Six has a known 6/6 success and gives 11 requests for 66 stories.
- Four would require 17 requests; three would require 22. More requests create more opportunities for 503/429/timeout and add fixed pacing and model overhead.
- Smaller batches reduce the blast radius of a shape rejection and reduce output length, but the current evidence cannot tell whether input content, output truncation, or service load caused those three rejections.
- Larger batches reduce request count but increase prompt/output work, timeout risk, and the security-preserving whole-batch rejection blast radius. I would not exceed six.

After disabling unnecessary reasoning and adding telemetry, compare at least several real weekly runs or a deliberately bounded dry-run sample. Useful measures are accepted stories per request, shape-rejection rate, p50/p95 latency, finish reasons, retries recovered, and total elapsed time. If shape failures remain batch-correlated, test **4 versus 6** with the same prompts and policy. Do not automatically split a shape-invalid batch in the initial design: retrying six and then recursively splitting can turn one failure into four or more paid calls and makes the run budget less obvious.

## 5. NVIDIA rate-limit signals and how to find out safely

I could not find an NVIDIA public contract stating that the hosted `integrate.api.nvidia.com` chat endpoint returns `Retry-After` or `x-ratelimit-*`. The current official [LLM endpoint reference](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-ultra-550b-a55b-infer) documents the endpoint and 200/202/422/500 responses, but does not document 429 or rate-limit response headers. NVIDIA documentation for other hosted-model workflows confirms that 429 can occur and recommends reducing request rate, but that is not a header contract for this endpoint. Therefore the accurate answer is **possibly, but not publicly guaranteed; measure it**.

No key needs to be pasted into chat, a document, or a command line. Two safe options are:

1. In the TypeScript transport, log an allow-list of response metadata for a local dry run: status, `retry-after`, header names beginning `x-ratelimit-`, `x-request-id`/correlation IDs, latency, `finish_reason`, and token usage. Never log `Authorization`, the complete header map, or untrusted response content. The key remains in the existing environment variable.
2. Locally, write the request body to a temporary file and run `curl --dump-header` with `Authorization: Bearer $NVIDIA_API_KEY`, where the variable is already exported in the shell. Keep shell tracing off, do not use `-v`, do not paste the resulting command/output here, and inspect only the allow-listed response headers. A successful request shows normal-response headers; a naturally occurring 429/503 is needed to learn failure headers. Do not intentionally flood the free tier to manufacture one.

Honour a valid `Retry-After` whenever present. Treat `x-ratelimit-*` as observability until NVIDIA documents their names and units; do not build scheduling logic around guessed semantics.

## 6. What is wrong or missing in the existing design

1. **Failure information is flattened too early.** `ChatResponse.error` is a string, so the caller cannot reliably distinguish retryable status, timeout, malformed body, or provider-requested delay.
2. **The model's reasoning mode is uncontrolled.** This is the largest model-specific concern. For a constrained translation/summarization task, request `reasoning_effort: "none"` (or the exact currently supported equivalent) and verify on a bounded dry run. This does not weaken output validation; it reduces unnecessary hidden work and the chance that the answer is truncated before complete JSON. Keep `max_tokens: 2000` initially, then tune only with usage evidence.
3. **Success metadata is discarded.** Preserve `finish_reason`, token usage, request ID, HTTP status, and latency. A shape failure with `finish_reason: "length"` calls for output/reasoning-budget correction, not rate backoff.
4. **The log aggregates away chronology.** Record batch number, attempt number, duration, outcome class, HTTP status, retry delay source, and accepted/dropped count. Do not log feed text or raw model content by default because both are untrusted and may contain sensitive or terminal-hostile material.
5. **The transport's never-throw contract is not represented by its type.** `ChatTransport` is an arbitrary async function, so `summarizeAll` correctly retains its catch as defence in depth. Retry orchestration must also catch injected sleep/clock/transport surprises and degrade safely.
6. **`resummarize.ts` can still throw outside summarization.** The explicit constraint says `summarizeAll` and transport must never throw, and they already aim to satisfy that. The backfill entry point's file reads, JSON parsing, config loading, and write can throw and are caught only by top-level `main().catch`, which ends with exit code 1. That is appropriate for storage/config corruption and should not be conflated with model degradation. However, writing after partial model success means accepted outputs persist while failed ones remain eligible for a later backfill; this behavior is useful and should remain explicit.
7. **All 2xx responses are assumed to be completed chat responses.** NVIDIA's endpoint reference also lists HTTP 202 with a request ID for later status polling. The current `response.ok` branch tries to read `choices` immediately and would report no content. No 202 appeared in the supplied production errors, so this is not an explanation for the observed run. Still, classify it explicitly. Initially I would return a distinct retryable `pending` failure and retry once after the server's delay signal; add status polling only if normal telemetry proves this model actually uses 202 often, because polling introduces another state machine and deadline policy.
8. **The evidence does not yet identify root cause.** Retry is resilience, not diagnosis. Add observability and control reasoning before concluding that free-tier rate limiting caused timeouts and shape failures.

## Concrete design sketch

The exact names are illustrative; the important part is the ownership and returned-value semantics.

```ts
type TransportFailure = {
  kind: 'timeout' | 'network' | 'http' | 'malformed-body' | 'empty-content';
  status?: number;
  retryAfterMs?: number;
  requestId?: string;
  message: string;
};

type ChatResponse =
  | { content: string; meta: { status: number; finishReason?: string; durationMs: number }; error: null }
  | { content: null; meta: { status?: number; durationMs: number }; error: TransportFailure };

type RetryTiming = {
  sleep: (ms: number) => Promise<void>;
  random: () => number;
  now: () => number;
};
```

For each batch, `summarizeAll` performs one attempt, validates any content, and decides whether the result is final. A shape-sound response is final even when some entries fail content checks. A retryable transport result or first shape rejection may consume one run-wide retry token, sleep, and make the second attempt with the longer timeout. Every code path converts exhaustion, budget limits, and unexpected collaborator throws into the existing failure count and errors array.

Tests should prove, without real sleeping:

- the retry matrix, including no retry for 400/401/403/422 and content rejection;
- one shape retry and no validation weakening;
- 75-second then 120-second timeouts are passed to attempts;
- `Retry-After` delta/date parsing, invalid values, and the 120-second cap;
- deterministic jitter through injected `random`;
- three-second success pacing except after the final batch;
- retry-cap and 25-minute-budget exhaustion returns all appropriate fallbacks;
- transport, sleep, and clock throws are converted to returned failures;
- request count and error chronology are visible;
- no secret or raw untrusted content appears in logs.

## What I would not do

- **Do not weaken or bypass shape/content validation.** Retrying changes availability, not the trust boundary.
- **Do not retry forever or use three attempts by default.** Free-tier calls and timeouts can multiply wall time and quota invisibly; the current sample justifies one bounded second chance.
- **Do not retry every 5xx by a numeric range.** Permanent protocol statuses such as 501/505 should not be retried without evidence.
- **Do not retry per-entry content failures.** That replaces accepted summaries and spends a whole request to rescue one safely fallen-back story.
- **Do not put independent retry loops in both layers.** Two attempts in each layer can silently become four wire calls per batch.
- **Do not parse retry decisions from error prose.** Return typed status and failure kind.
- **Do not use a fixed 60-second timeout for every attempt, an unbounded timeout, or an unbounded `Retry-After`.** Each mishandles a different failure mode.
- **Do not immediately reduce batches to three or increase beyond six.** Both change request pressure and confound the first reliability experiment.
- **Do not assume OpenAI compatibility includes OpenAI's rate-limit headers.** Wire compatibility for request/response JSON is not a promise of identical operational headers.
- **Do not intentionally trigger rate limiting or expose a key to discover headers.** Observe allow-listed metadata during normal authenticated runs.
- **Do not call the observed run proof of progressive slowdown.** Its available timing is equally consistent with eight normal-duration calls and three stalls.
- **Do not treat retry as the fix for likely token exhaustion.** Disable unnecessary reasoning and inspect `finish_reason`/usage first.

## Suggested rollout order

1. Add structured response metadata and safe per-attempt logging; run a bounded `--dry-run` without changing retry behavior.
2. Explicitly disable reasoning for this task and verify output quality plus shape/latency on real inputs.
3. Add the injectable pacing, timeout, one-retry, global retry-cap, and run-budget policy with deterministic tests.
4. Observe several weekly/backfill runs. Change batch size only if the new evidence isolates batch length as a driver.

This order keeps the exploratory findings exploratory: it obtains the missing evidence, removes a model-configuration confounder, then adds bounded resilience without changing the publication trust boundary.
