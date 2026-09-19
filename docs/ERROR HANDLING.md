# ColdCase — Error Handling

Errors in ColdCase are not edge cases; they are the product surface where trust is either earned or lost. A pipeline that crashes silently, a web app that renders a broken claim, or a worker that returns a stack trace all undermine the same guarantee: every finding has a receipt, and nothing is shown that we cannot verify. This document defines how every layer of ColdCase detects, classifies, reports, retries, and recovers from failure. It is the reference for anyone writing a `try` block, an `if (error)` branch, or a user-facing message.

---

## 1. Principles

Five rules govern every error in every layer. They are not guidelines.

**Errors are data, not surprises.** Every error has a code, a category, and a message. It is logged, counted, and reported. Nothing fails silently.

**Fail loudly in the pipeline, fail gracefully in the browser.** The pipeline is a developer tool; it exits with a clear code and a JSON line on stdout. The web app is a demo surface; it degrades with a banner, never with a blank screen.

**Never show a stack trace to a user.** Stack traces go to stderr or a log file. User-facing messages are plain, short, and actionable.

**A failed LLM call is not a failed pipeline.** If one file's story cannot be generated, the file is skipped and logged. The rest of the case continues. Trust comes from honesty about what failed, not from hiding it.

**When in doubt, say "I don't know."** The `NONE` confidence tier exists precisely for this. A file whose history is junk produces "No recorded reason found," not a guess.

---

## 2. Error taxonomy

Every error belongs to exactly one category. The category determines who handles it, how it is retried, and whether it is fatal.

| Category | Examples | Retried? | Fatal to pipeline? | Shown to user? |
|---|---|---|---|---|
| **Input** | Invalid repo URL, private repo, missing args | No | Yes | Yes, plain message |
| **Environment** | Missing API key, no git binary, disk full | No | Yes | Yes, plain message |
| **Transient** | Rate limit, network timeout, 5xx from a provider | Yes, backoff | Only if retries exhaust | Only via final banner |
| **Validation** | Zod parse failure, malformed LLM JSON | Yes, up to 2 retries | No, skip the file | No |
| **Trust** | Quote not found, claim has no evidence | No | Yes (invariant check) | Yes, as removal from the story |
| **Internal** | Unexpected `undefined`, type error, logic bug | No | Yes | No, internal only |

Categories are attached to error codes. A code like `github_rate_limited` is Transient; `quote_not_found` is Trust; `invalid_repo_url` is Input.

---

## 3. Pipeline error handling

The pipeline is a chain of steps. Each step either succeeds, retries, or fails the pipeline. No step swallows an error.

### 3.1 Exit codes

The pipeline uses a fixed set of exit codes. They are stable and are referenced by tooling and by the eval harness.

| Code | Meaning | Typical cause |
|---|---|---|
| `0` | Success | Snapshot written |
| `1` | Invalid arguments | Bad CLI flags |
| `2` | Repo unavailable | Not found, private, or over size limit |
| `3` | GitHub rate limit | Quota exhausted, retries exhausted |
| `4` | LLM failure | Invalid JSON after retries, or provider down |
| `5` | Invariant failure | A trust invariant was violated |
| `6` | Filesystem error | Cannot write DB or snapshot |

A non-zero exit always prints one JSON line to stdout before exiting, so a wrapper script can parse the failure.

### 3.2 Errors by step

Each step has a defined failure behavior. Nothing is left to chance.

| Step | Failure mode | Behavior |
|---|---|---|
| `ingest` | Invalid `owner/repo` | Exit 1 with `invalid_repo_url` |
| `ingest` | Repo not found, private, or over size | Exit 2 with `repo_unavailable` |
| `ingest` | Clone fails (network, disk) | Retry twice; exit 6 if it still fails |
| `hotspots` | No files pass the ignore filter | Exit 2 with `no_analyzable_files` |
| `history` | Rename chain cannot be resolved | Log and continue; the file's history is incomplete |
| `blame` | `git blame` times out | Skip the file; log `blame_timeout` |
| `link` | GitHub API returns 5xx | Retry with backoff; on exhaustion, continue without the missing links |
| `link` | GitHub rate limit hit | Retry with backoff; on exhaustion, exit 3 |
| `ledger` | Evidence ID collision | Exit 5 with `evidence_id_collision` |
| `pack` | Token budget cannot be met even after truncation | Log and continue; flag `sampled_history` |
| `stories` | LLM returns invalid JSON after retries | Skip the file; log `invalid_json` |
| `stories` | LLM provider returns 429 | Retry with backoff; on exhaustion, exit 4 |
| `verify` | Quote not found for a `stated` claim | Remove the claim; log `quote_not_found` |
| `verify` | Claim cites an unknown evidence ID | Remove the claim; log `unknown_evidence_id` |
| `summary` | Gemini returns invalid JSON | Retry twice; on exhaustion, write an empty synthesis and log a warning |
| `persist` | SQLite write fails | Exit 6 |
| `export` | Snapshot write fails | Exit 6 |
| `invariants` | Any invariant fails | Exit 5 with the failing invariant name |

### 3.3 What "skip the file" means

When a step skips a file, the file is not silently dropped. It is:

1. Logged with its path and the reason.
2. Marked in the pipeline output as failed.
3. Excluded from the snapshot's `files[]` array.
4. Counted in the final `{"pipeline":"complete",...}` line under `files_failed`.

A file that fails is more honest than a file whose story is fabricated.

### 3.4 The invariant check is the last gate

The `invariants` step runs after everything else and before `persist` and `export`. If any trust invariant fails, the pipeline exits with code 5 and writes nothing. This is deliberate: a snapshot that violates a trust invariant must never reach the web app.

Never disable the invariant check. Never relax an invariant to make a run pass. Fix the upstream step instead.

---

## 4. Worker error handling (P1)

The worker is a small HTTP server. It is the only place in ColdCase where an error is turned into an HTTP response. Its rules are stricter than the pipeline's because a stranger is on the other end.

### 4.1 HTTP status and error codes

| HTTP | `error` value | When |
|---|---|---|
| 400 | `invalid_repo_url` | URL does not match the GitHub pattern |
| 400 | `invalid_request_body` | Missing or malformed JSON body |
| 403 | `repo_private` | Repo is private |
| 404 | `repo_not_found` | Repo does not exist |
| 413 | `repo_too_large` | Repo exceeds `MAX_REPO_SIZE_KB` |
| 429 | `rate_limited` | Per-IP limit exceeded |
| 429 | `daily_cap_reached` | Daily job cap reached |
| 500 | `invariant_failed` | Pipeline invariant check failed |
| 502 | `llm_failed` | LLM provider returned an error after retries |
| 503 | `live_mode_disabled` | `LIVE_MODE_ENABLED` is false |
| 503 | `github_rate_limited` | GitHub quota exhausted |
| 503 | `queue_full` | A job is already running |
| 504 | `pipeline_timeout` | Job exceeded its time budget |

### 4.2 Response shape

Every error response is JSON with the same shape:

```
{
  "error": "invalid_repo_url",
  "message": "Please paste a GitHub repository URL like https://github.com/owner/repo.",
  "retry_after_seconds": 60
}
```

`error` is a stable machine-readable string. `message` is a plain sentence for a human. `retry_after_seconds` is present only for 429 and 503 responses where a retry could succeed.

### 4.3 What a worker error response never contains

- A stack trace
- A file path
- An environment variable name
- An API key, even partially masked
- The name of an internal function
- A raw provider error message

If the underlying error needs to be preserved for debugging, it is written to the worker's log, not to the response.

### 4.4 Job state on failure

When a job fails, the worker:

1. Sets `status = failed` on the job row.
2. Writes a short, friendly `message` (the same one returned to the client).
3. Writes the raw error to the log, never to the job row.
4. Leaves `case_id` null.

The web app polls the job and reads the friendly message. It never sees the raw error.

---

## 5. Web app error handling

The web app has one job: render the snapshot, or explain why it cannot. It never crashes to a blank screen. It never shows a stack trace.

### 5.1 Error classes

The data layer throws typed errors (see `API_SPECIFICATIONS.md` §5.4):

| Class | Code | UI behavior |
|---|---|---|
| `SnapshotNotFoundError` | `SNAPSHOT_NOT_FOUND` | Show a "case not found" panel with a link to the case library |
| `SnapshotSchemaError` | `SNAPSHOT_SCHEMA_MISMATCH` | Show a "stale snapshot" banner; render the repo header only |
| `FileNotFoundError` | `FILE_NOT_FOUND` | Show a "file not found" panel with a link to the case overview |
| `LiveModeUnavailableError` | `LIVE_MODE_UNAVAILABLE` | Disable the live input; show a link to the example cases |

### 5.2 Rendering rules

- A missing claim is not rendered. If a claim violates a trust invariant at render time, it is dropped and a small count is shown in a developer console (never in the UI).
- A missing evidence item is not rendered as a dead link. If a claim's `evidence_ids` reference an item that is not in the snapshot, the claim is dropped and the drop is counted.
- A missing file is not rendered as an empty page. It shows the "file not found" panel.

### 5.3 The three banners

The web app has three honesty banners. They are shown when the data warrants them, and they are never suppressed for aesthetics.

| Banner | Trigger | Copy |
|---|---|---|
| Sampled history | `files[].sampled_history === true` | "This story is based on a sample of the file's history. Some commits were not analyzed." |
| Low evidence | A file has no HIGH or MEDIUM claims | "This file has little recorded reasoning. ColdCase is showing what it found, not guessing." |
| Case limited | `stats.files_analyzed < stats.files_total` | "This case covers the top {{N}} of {{M}} files. Files not listed were not analyzed." |

### 5.4 Global error boundary

A React error boundary wraps every route. If a component throws, the boundary:

1. Logs the error to the browser console with the route and the component stack.
2. Renders a plain panel: "Something went wrong on this page. Try reloading, or open another case."
3. Offers a link to the case library.

The boundary never shows the error message, the component stack, or a file path.

### 5.5 The offline guarantee

On demo day, `VITE_DATA_SOURCE=static`. The web app reads only bundled snapshots. If a network call is attempted anywhere on the demo path, it is a bug, not an error to handle.

The one network call that is allowed is `getJob()` in live mode (P1), and only when the user has explicitly submitted a URL. Every other screen must render with the network off.

---

## 6. Retry policies

Retries are not a substitute for correctness. They exist for transient failures only. Every retry has a bound.

### 6.1 Retryable errors

| Error | Retried by | Max attempts | Backoff |
|---|---|---|---|
| GitHub 5xx | `util/retry.ts` | 3 | 1 s, 2 s, 4 s |
| GitHub rate limit (secondary) | `util/retry.ts` | 3 | Honor `Retry-After` header |
| LLM invalid JSON | `llm/index.ts` | 2 | 1 s, 2 s |
| LLM 429 | `llm/index.ts` | 3 | 1 s, 2 s, 4 s |
| LLM 5xx | `llm/index.ts` | 3 | 1 s, 2 s, 4 s |
| `git clone` network failure | `steps/ingest.ts` | 2 | 2 s, 8 s |
| Worker pipeline timeout | `apps/worker` | 0 | Not retried |

### 6.2 Non-retryable errors

- Invalid input (bad URL, missing args)
- Private or missing repo
- Trust invariant failure
- Unknown evidence ID
- Missing quote on a `stated` claim
- Zod validation failure on the CLI args
- Disk full

Retrying a non-retryable error is wasted time and hides bugs.

### 6.3 Backoff rules

- Exponential with a factor of 2.
- Jitter of ±20% to avoid thundering herds.
- A hard cap of 8 seconds between retries.
- Total time per call capped at 30 seconds.

If a retry budget is exhausted, the error is promoted to the calling step, which decides whether it is fatal or a skip.

---

## 7. Logging rules

Every error is logged once, at the layer that handles it. Nothing is logged twice.

### 7.1 What is logged

- Step name
- Error code
- Short message
- Counts (files failed, claims removed, evidence dropped)
- Duration in milliseconds
- Job ID (worker only)

### 7.2 What is never logged

- API keys, tokens, or any value matching a secret pattern
- Full evidence bodies (they contain untrusted text)
- Full prompt transcripts
- File paths from the local filesystem
- Stack traces in production builds

### 7.3 Format

The pipeline logs one JSON line per event to stderr. Machine-readable, greppable, and easy to pipe into a log file per run.

```
{"step":"stories","status":"fail","file":"src/util.js","error":"invalid_json","attempts":3,"duration_ms":4210}
{"step":"verify","status":"removed","claim_id":"clm_01H…","reason":"quote_not_found","evidence_ids":["pr:1234"]}
```

The web app logs to the browser console only in development. Production builds log nothing except through the error boundary.

The worker logs to stderr in the same JSON format as the pipeline. Its log is separate from the pipeline's log so the two can be tailed independently.

### 7.4 The run log

The pipeline writes one log file per run at `.cache/logs/<owner>__<repo>__<sha>.log`. The eval harness and any debugging session read from these files. They are gitignored.

---

## 8. User-facing messages

Every message a user sees is plain, short, and actionable. It says what happened and what to do next. It never blames the user and never uses jargon.

### 8.1 Message rules

- One sentence, two at most.
- No error codes in the message. Codes go in the logs.
- No "An unexpected error occurred." That phrase means the writer did not know what happened.
- No apologies. Users want a fix, not sympathy.
- Always offer a next step when one exists.

### 8.2 Copy for common cases

| Situation | Message |
|---|---|
| Invalid repo URL | "Please paste a GitHub repository URL like https://github.com/owner/repo." |
| Repo private | "This repository is private. ColdCase only works with public repositories." |
| Repo not found | "This repository does not exist, or it was renamed. Check the URL and try again." |
| Repo too large | "This repository is too large for live analysis. Try one of the example cases." |
| GitHub rate limit | "GitHub is rate-limiting us right now. Try again in a minute, or open an example case." |
| LLM failure | "We could not generate the story for this file. The rest of the case is available." |
| Live mode disabled | "Live analysis is turned off right now. Try one of the example cases." |
| Snapshot mismatch | "This case was generated with an older version of ColdCase. Rebuild the case to see its claims." |
| File not found | "This file is not part of the analyzed set. Open the case overview to see which files were analyzed." |
| Browser error boundary | "Something went wrong on this page. Try reloading, or open another case." |

### 8.3 What is never shown

- The word "null", "undefined", "NaN", or "TypeError"
- A stack trace, even truncated
- A raw provider error (e.g. the Groq API's JSON)
- A confidence tier without its label and icon
- A claim without its receipt link
- A `NONE` claim without the "No recorded reason found" text

---

## 9. Recovery and escalation

Some errors can be recovered from automatically. Others require a human.

### 9.1 Automatic recovery

- Retry on transient errors.
- Skip a file whose story cannot be generated.
- Drop a claim whose quote does not verify.
- Downgrade a claim whose entailment verdict is `partial`.
- Fall back to the snapshot if a live call fails.

### 9.2 Manual recovery

These require a human decision. They are recorded in `DECISIONS.md`.

- A demo repo turns out to have too little evidence to demonstrate the product.
- A quota is exhausted before all demo repos have been processed.
- The walking skeleton is not working by hour 9.
- An invariant keeps failing after a fix.
- A demo snapshot needs to be regenerated during the freeze window.

### 9.3 Escalation

An error is escalated to the human collaborator when:

1. It blocks the walking skeleton.
2. It blocks a trust invariant.
3. It blocks the demo path.
4. It has been retried to exhaustion twice.
5. It requires a decision that is not covered by the specs.

Escalation means: stop, write a one-paragraph summary, ask. Do not work around it silently.

---

## 10. Testing error paths

Error paths are tested the same way as happy paths. A trust product that only works when everything goes well is not trustworthy.

### 10.1 Unit tests

- `quoteCheck()` rejects a quote that does not appear in the evidence.
- `computeConfidence()` returns `NONE` when `evidence_ids` is empty.
- `isJunkMessage()` returns true for every pattern in the list.
- `isSubstantiveText()` returns false for template boilerplate.
- `invariants.ts` fails when a claim has no evidence.

### 10.2 Fixture repo errors

The fixture repo deliberately contains:

- A file whose history is only junk commits, expected to yield `NONE`.
- A file with a claim the model is likely to state without a quote, expected to be removed by the quote check.
- A file with an undocumented change, expected to yield `LOW`.
- A commit with a `#N` reference to a non-existent PR, expected to be skipped by the linker.

These are load-bearing. Never remove one to make a test pass.

### 10.3 Manual checks

- Open a case with the network off. Nothing should break.
- Open a file whose story is `NONE`. The "No recorded reason found" text must appear.
- Click a gutter marker on a line with no linked evidence. The Line Why panel must say so.
- Disconnect the worker and submit a URL in live mode. The error must be plain and actionable.
- Open the site in a browser with JavaScript errors forced. The error boundary must catch them.

---

## 11. Anti-patterns

Things that break the trust story if done. Each is forbidden by `AI_RULES.md`.

- **Catching an error and continuing silently.** Every catch either handles the error and logs why, or re-throws with context.
- **Logging a secret.** Never. Not even a prefix.
- **Showing a stack trace.** Never, to anyone.
- **Retrying a non-retryable error.** Wastes time and hides bugs.
- **Disabling the invariant check.** Never, under any circumstance.
- **Skipping a file and not counting it.** Every skipped file is logged and counted.
- **Showing a claim whose quote failed verification.** Drop it. The `NONE` placeholder is the only allowed substitute.
- **Rendering a dead evidence link.** If the evidence is not in the snapshot, do not render the link.
- **"Something went wrong."** Always say what went wrong and what to do next.
- **Retrying after a trust failure.** Trust failures are deterministic. Fix the input, not the retry.
- **Using `console.log` in shipped code.** Use the structured logger.
- **Treating a worker 5xx as a demo blocker.** The demo runs on static snapshots. The worker is not on the demo path.

---

## 12. Error code index

A single place to look up an error code. Codes are stable strings.

| Code | Category | Layer | Meaning |
|---|---|---|---|
| `invalid_args` | Input | CLI | CLI flags are malformed |
| `invalid_repo_url` | Input | CLI, worker | URL does not match the GitHub pattern |
| `repo_unavailable` | Input | CLI | Repo is private, missing, or over size |
| `repo_not_found` | Input | Worker | Repo does not exist |
| `repo_private` | Input | Worker | Repo is private |
| `repo_too_large` | Input | Worker | Repo exceeds `MAX_REPO_SIZE_KB` |
| `no_analyzable_files` | Input | CLI | Every file was filtered out |
| `missing_api_key` | Environment | CLI, worker | A required env var is unset |
| `git_not_installed` | Environment | CLI, worker | The `git` binary is not on PATH |
| `disk_full` | Environment | CLI, worker | Cannot write cache or snapshot |
| `github_rate_limited` | Transient | CLI, worker | GitHub quota exhausted |
| `github_server_error` | Transient | CLI, worker | GitHub returned 5xx |
| `github_timeout` | Transient | CLI, worker | GitHub did not respond in time |
| `llm_rate_limited` | Transient | CLI, worker | Provider returned 429 |
| `llm_server_error` | Transient | CLI, worker | Provider returned 5xx |
| `llm_failed` | Transient | Worker | LLM failure after retries |
| `pipeline_timeout` | Transient | Worker | Job exceeded its time budget |
| `invalid_json` | Validation | CLI, worker | LLM output did not match the schema |
| `schema_mismatch` | Validation | Web | Snapshot version does not match the app |
| `quote_not_found` | Trust | CLI | A `stated` claim's quote is not in its evidence |
| `unknown_evidence_id` | Trust | CLI | A claim cites an ID that does not resolve |
| `claim_without_evidence` | Trust | CLI | A non-`NONE` claim has no evidence IDs |
| `evidence_id_collision` | Trust | CLI | Two evidence items share an ID |
| `invariant_failed` | Trust | CLI, worker | One of the trust invariants was violated |
| `blame_timeout` | Internal | CLI | `git blame` exceeded its time budget |
| `rename_chain_unresolved` | Internal | CLI | A file's rename chain could not be resolved |
| `queue_full` | Internal | Worker | A job is already running |
| `live_mode_disabled` | Internal | Worker | `LIVE_MODE_ENABLED` is false |
| `daily_cap_reached` | Internal | Worker | Daily job cap reached |
| `rate_limited` | Internal | Worker | Per-IP limit exceeded |
| `internal_error` | Internal | Any | Unclassified failure; logged with context |

---

## 13. Quick reference for new code

When you write a `try` block, ask five questions in order:

1. **Is this error retryable?** If yes, route it through `withRetry()`. If no, do not retry.
2. **Is this error fatal to the pipeline?** If yes, exit with the correct code and log one JSON line. If no, skip the file, count it, and continue.
3. **Is this error user-facing?** If yes, use a plain message from §8.2. If no, log it and move on.
4. **Does this error affect a trust invariant?** If yes, it is fatal, always.
5. **Have I logged it exactly once?** If not, fix that before merging.

If you cannot answer all five, stop and check the specs.

---

**End of Error Handling**