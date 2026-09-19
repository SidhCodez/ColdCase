# ColdCase — API Specifications

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | September 19, 2026 |
| **Status** | Ready for implementation |
| **Source documents** | `PRD.md`, `TRD.md`, `System-Architecture.md`, `CACHE_SCHEMA.md` |
| **Scope** | All interfaces between components: pipeline CLI, snapshot data contract, worker HTTP API (P1), and the web app data layer |

> **Note on storage conflict.** `System-Architecture.md` proposed Supabase/Postgres. `CACHE_SCHEMA.md` supersedes that decision: storage is **SQLite (live cache) + JSON files (demo artifacts)**. This API spec follows the CACHE_SCHEMA decision. There is no Supabase API surface anywhere in this document.

---

## 1. Overview

ColdCase has **four distinct interfaces**, each with a different consumer:

| Interface | Consumer | Protocol | Priority |
|---|---|---|---|
| **Pipeline CLI** | A teammate on a laptop | Command-line arguments | P0 |
| **Snapshot JSON contract** | The web app (build-time import) | File format (JSON) | P0 |
| **Worker HTTP API** | The web app (live mode) | HTTP / JSON | P1 |
| **Web App Data Layer** | React components | In-process TypeScript functions | P0 |

The pipeline is synchronous and offline. The web app never talks to GitHub, LLMs, or git. The snapshot JSON contract is the boundary between them — everything the web app needs must be present in the snapshot.

---

## 2. Pipeline CLI API

### 2.1 Invocation

```bash
npm run pipeline -- --repo <owner/repo> --top <N> [flags]
```

### 2.2 Arguments

| Flag | Type | Required | Default | Description |
|---|---|---|---|---|
| `--repo` | string | **Yes** | — | GitHub repository in `owner/repo` form |
| `--top` | integer | No | `10` | Number of hotspot files to analyze (1–50) |
| `--force` | boolean | No | `false` | Ignore cache; re-fetch from GitHub and re-run LLMs |
| `--out` | string | No | `data/demo` | Output directory for snapshot JSON |
| `--db` | string | No | `.cache/coldcase.db` | Path to the SQLite cache |
| `--verbose` | boolean | No | `false` | Print per-step timing and LLM call counts |
| `--dry-run` | boolean | No | `false` | Run steps 1–6 only (ingest → ledger); skip LLM and export |

### 2.3 Exit codes

| Code | Meaning |
|---|---|
| `0` | Success; snapshot written |
| `1` | Invalid arguments |
| `2` | Repo not found, private, or over size limit |
| `3` | GitHub API rate limit hit and not recoverable |
| `4` | LLM call failed after retries |
| `5` | Invariant check failed (a claim has no receipt, or a `stated` quote is missing) |
| `6` | Filesystem error (cannot write DB or snapshot) |

### 2.4 Stdout contract

The pipeline prints one JSON line per step to stdout for machine consumption, plus human-readable progress to stderr.

```
{"step":"ingest","status":"ok","ref_sha":"a3f9c2b1…","duration_ms":4210}
{"step":"hotspots","status":"ok","count":10,"duration_ms":310}
{"step":"history","status":"ok","files":10,"duration_ms":1200}
...
{"step":"invariants","status":"ok","checks_passed":7,"duration_ms":40}
{"step":"persist","status":"ok","case_id":"…","duration_ms":88}
{"step":"export","status":"ok","snapshot":"data/demo/owner__repo.json","duration_ms":12}
{"pipeline":"complete","claims_total":42,"claims_removed":3,"duration_ms":312400}
```

On failure:

```
{"step":"verify","status":"fail","error":"claim clm_01H… has no matching quote","duration_ms":120}
{"pipeline":"failed","exit_code":5}
```

### 2.5 Side effects

On success, the pipeline:

1. Writes to `.cache/coldcase.db` (SQLite; tables from `CACHE_SCHEMA.md`).
2. Writes `data/demo/<owner>__<repo>.json` (the snapshot; see §3).
3. Updates `cache_metadata` with `run.last_completed_at` and `run.last_repo`.
4. Writes nothing to GitHub, ever.

---

## 3. Snapshot JSON Contract

This is the **only** data source the web app reads in `static` mode. It is self-contained: opening it must be enough to render the entire case with zero network calls.

### 3.1 File location and naming

```
data/demo/<owner>__<repo>.json
```

Double underscore separates owner and repo because `/` is not filesystem-safe on all platforms. Example: `data/demo/axios__axios.json`.

### 3.2 Top-level shape

```
{
  "schema_version": "1.0.0",
  "generated_at": "2026-09-19T00:12:44Z",
  "repo": {
    "owner": "owner",
    "name": "repo",
    "default_branch": "main",
    "last_fetched_sha": "a3f9c2b1…"
  },
  "synthesis": {
    "schema_version": "1.0.0",
    "source_ref": "owner/repo@a3f9c2b1",
    "eras": [ … ],
    "key_decisions": [ … ]
  },
  "stats": {
    "files_analyzed": 10,
    "files_total": 412,
    "confidence_mix": { "HIGH": 5, "MEDIUM": 3, "LOW": 2, "NONE": 0 }
  },
  "files": [ … ],
  "evidence": [ … ]
}
```

### 3.3 `files[]` entry

```
{
  "path": "src/util.js",
  "hotspot_rank": 1,
  "change_count": 27,
  "sampled_history": false,
  "content": "…full file text at the analyzed ref…",
  "blame": [
    {
      "start": 1,
      "end": 14,
      "sha": "a3f9c2b1…",
      "evidence_ids": ["commit:a3f9c2b1…", "pr:1234"]
    }
  ],
  "narrative": {
    "schema_version": "1.0.0",
    "path": "src/util.js",
    "source_ref": "owner/repo@a3f9c2b1",
    "sampled_history": false,
    "claims": [
      {
        "claim_id": "clm_01H…",
        "text": "The 200 ms delay was added to work around a race in the upstream SDK.",
        "evidence_ids": ["commit:a3f9c2b1", "pr:1234", "issue:567"],
        "confidence_tier": "HIGH",
        "stated_vs_inferred": "stated",
        "quote": "we added a short delay to let the SDK finish flushing",
        "line_range": { "start": 42, "end": 44 }
      }
    ]
  }
}
```

### 3.4 `evidence[]` entry

```
{
  "id": "pr:1234",
  "type": "pull_request",
  "url": "https://github.com/owner/repo/pull/1234",
  "title": "Add delay to flush()",
  "body": "…",
  "author": "octocat",
  "created_at": "2021-04-12T09:14:00Z"
}
```

### 3.5 Field constraints

| Field | Type | Required | Notes |
|---|---|---|---|
| `schema_version` | string | Yes | Must match `SCHEMA_VERSION` the web app was built against |
| `generated_at` | ISO 8601 string | Yes | UTC |
| `repo.owner` | string | Yes | |
| `repo.name` | string | Yes | |
| `repo.default_branch` | string | Yes | |
| `repo.last_fetched_sha` | string | Yes | 40-char SHA |
| `stats.files_analyzed` | integer | Yes | |
| `stats.files_total` | integer | Yes | Denominator for the "top N of M" honesty banner |
| `stats.confidence_mix` | object | Yes | Keys: `HIGH`, `MEDIUM`, `LOW`, `NONE`; values: integers |
| `files[].path` | string | Yes | |
| `files[].hotspot_rank` | integer | Yes | 1-based |
| `files[].change_count` | integer | Yes | |
| `files[].sampled_history` | boolean | Yes | True if evidence packing truncated history |
| `files[].content` | string | Yes | Full file text at the analyzed ref |
| `files[].blame[]` | array | Yes | May be empty |
| `files[].blame[].start` | integer | Yes | 1-based inclusive |
| `files[].blame[].end` | integer | Yes | 1-based inclusive |
| `files[].blame[].sha` | string | Yes | |
| `files[].blame[].evidence_ids` | string[] | Yes | May be empty |
| `files[].narrative.claims[]` | array | Yes | May be empty only if the file genuinely has no history |
| `files[].narrative.claims[].claim_id` | string | Yes | Stable within the narrative |
| `files[].narrative.claims[].text` | string | Yes | |
| `files[].narrative.claims[].evidence_ids` | string[] | Yes | May be empty only when `confidence_tier` is `NONE` |
| `files[].narrative.claims[].confidence_tier` | enum | Yes | One of `HIGH`, `MEDIUM`, `LOW`, `NONE` |
| `files[].narrative.claims[].stated_vs_inferred` | enum | Yes | One of `stated`, `inferred` |
| `files[].narrative.claims[].quote` | string | Conditional | Required when `stated_vs_inferred` is `stated` |
| `files[].narrative.claims[].line_range` | object | No | `{ start, end }` if the claim maps to specific lines |
| `evidence[].id` | string | Yes | Format per CACHE_SCHEMA §C |
| `evidence[].type` | enum | Yes | `commit`, `pull_request`, `issue`, `review_comment`, `issue_comment` |
| `evidence[].url` | string | Yes | Must be a valid GitHub URL |
| `evidence[].title` | string | No | |
| `evidence[].body` | string | Yes | May be empty string but not null |
| `evidence[].author` | string | No | |
| `evidence[].created_at` | ISO 8601 string | No | |

### 3.6 Invariants the snapshot must satisfy

The web app assumes and the pipeline guarantees (via `invariants.ts`):

1. Every claim with `confidence_tier != "NONE"` has at least one entry in `evidence_ids`.
2. Every ID in any `evidence_ids` array appears in the top-level `evidence[]` array.
3. Every claim with `stated_vs_inferred == "stated"` has a non-empty `quote`.
4. Every `files[].blame[].sha` appears in `evidence[]` as `commit:<sha>`.
5. `stats.files_analyzed == files.length`.
6. `stats.confidence_mix` totals equal the sum of `claims[].confidence_tier` across all files.

A snapshot that violates any invariant is rejected by the web app (see §5.4).

---

## 4. Worker HTTP API (P1)

The worker is a small Express server that runs the pipeline on demand for small public repos. It is only deployed if P0 is stable.

### 4.1 Base URL

```
https://<worker-host>/
```

Configured in the web app via `VITE_WORKER_URL`.

### 4.2 Common headers

| Header | Required | Notes |
|---|---|---|
| `Content-Type: application/json` | Yes (for POST) | |
| `Origin` | Yes | Must match `ALLOWED_ORIGIN` or the request is rejected by CORS |

### 4.3 `POST /analyze`

Request a live analysis of a small public repo.

**Request body:**

```
{
  "repoUrl": "https://github.com/owner/repo"
}
```

**Validation rules:**
- `repoUrl` must match `^https?://github\.com/[a-zA-Z0-9_-]+/[a-zA-Z0-9_.-]+$`
- Repo must be public
- Repo size must be under `MAX_REPO_SIZE_KB`
- Only one job runs at a time (queue depth 1)

**Response (202 Accepted):**

```
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (400 Bad Request):**

```
{
  "error": "invalid_repo_url",
  "message": "Please paste a GitHub repository URL like https://github.com/owner/repo."
}
```

**Response (503 Service Unavailable):**

```
{
  "error": "live_mode_disabled",
  "message": "Live analysis is turned off right now. Try one of the example cases."
}
```

**Response (429 Too Many Requests):**

```
{
  "error": "rate_limited",
  "message": "Too many requests. Try again in a minute.",
  "retry_after_seconds": 60
}
```

### 4.4 `GET /job/:jobId`

Poll the status of a running or completed job.

**Response (200 OK, running):**

```
{
  "jobId": "550e8400-…",
  "status": "running",
  "step": "linking",
  "startedAt": "2026-09-19T00:12:00Z"
}
```

**Response (200 OK, done):**

```
{
  "jobId": "550e8400-…",
  "status": "done",
  "caseUrl": "/c/owner/repo",
  "completedAt": "2026-09-19T00:14:22Z"
}
```

**Response (200 OK, failed):**

```
{
  "jobId": "550e8400-…",
  "status": "failed",
  "error": "repo_too_large",
  "message": "This repository is too large for live mode. Try an example case.",
  "failedAt": "2026-09-19T00:13:10Z"
}
```

**Step values:** `queued`, `cloning`, `linking`, `ranking`, `writing`, `verifying`, `summarizing`, `persisting`, `done`, `failed`.

### 4.5 `GET /health`

**Response (200 OK):**

```
{
  "status": "ok",
  "liveModeEnabled": true,
  "queueDepth": 0,
  "uptimeSeconds": 4210
}
```

### 4.6 Rate limits

| Limit | Value | Enforced by |
|---|---|---|
| Requests per IP per minute | 5 | `express-rate-limit` |
| Concurrent jobs | 1 | In-memory queue in `queue.ts` |
| Daily job cap | 50 (configurable) | Counter in `cache_metadata` equivalent |
| Per-repo size | `MAX_REPO_SIZE_KB` | Checked before clone |

### 4.7 Failure modes

| Condition | HTTP status | `error` value |
|---|---|---|
| Invalid URL format | 400 | `invalid_repo_url` |
| Repo not found | 404 | `repo_not_found` |
| Repo is private | 403 | `repo_private` |
| Repo too large | 413 | `repo_too_large` |
| GitHub rate limit hit | 503 | `github_rate_limited` |
| LLM call failed | 502 | `llm_failed` |
| Invariant check failed | 500 | `invariant_failed` |
| Live mode disabled | 503 | `live_mode_disabled` |

---

## 5. Web App Data Layer API

The data layer is a single module (`apps/web/src/lib/data.ts`) that all React components call. It hides whether data comes from a snapshot file or the worker.

### 5.1 Functions

```typescript
export async function listCases(): Promise<CaseSummary[]>;

export async function getCase(
  owner: string,
  repo: string
): Promise<CaseDetail>;

export async function getFile(
  owner: string,
  repo: string,
  path: string
): Promise<FileDetail>;

export async function getJob(jobId: string): Promise<JobStatus>; // P1
```

### 5.2 Return types

```typescript
interface CaseSummary {
  owner: string;
  repo: string;
  title: string;                 // "owner/repo"
  filesAnalyzed: number;
  confidenceMix: { HIGH: number; MEDIUM: number; LOW: number; NONE: number };
  generatedAt: string;           // ISO 8601
  source: 'static' | 'live';
}

interface CaseDetail {
  owner: string;
  repo: string;
  defaultBranch: string;
  lastFetchedSha: string;
  generatedAt: string;
  synthesis: Synthesis;
  stats: { filesAnalyzed: number; filesTotal: number; confidenceMix: ConfidenceMix };
  files: FileSummary[];
}

interface FileSummary {
  path: string;
  hotspotRank: number;
  changeCount: number;
  sampledHistory: boolean;
}

interface FileDetail {
  path: string;
  content: string;
  blame: BlameRange[];
  narrative: Narrative;
  evidence: Evidence[];          // Only the evidence cited by this file's claims
}

interface JobStatus {
  jobId: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  step?: string;
  caseUrl?: string;
  error?: string;
  message?: string;
}
```

### 5.3 Data source selection

Controlled by `VITE_DATA_SOURCE` environment variable:

| Value | Behavior |
|---|---|
| `static` | Reads only from `public/snapshots/*.json`. Zero network calls. Used on demo day. |
| `supabase` (legacy) | **Deprecated.** Will be removed. Do not use. |
| `live` (P1) | Reads from snapshot for pre-computed cases; routes unknown cases to the worker. |

If `VITE_DATA_SOURCE=static` and a snapshot is missing, the function throws a `SnapshotNotFoundError`.

### 5.4 Errors

All data-layer functions throw typed errors:

```typescript
class SnapshotNotFoundError extends Error {
  code = 'SNAPSHOT_NOT_FOUND';
  constructor(public owner: string, public repo: string) {
    super(`No snapshot for ${owner}/${repo}`);
  }
}

class SnapshotSchemaError extends Error {
  code = 'SNAPSHOT_SCHEMA_MISMATCH';
  constructor(
    public owner: string,
    public repo: string,
    public expected: string,
    public actual: string
  ) {
    super(`Snapshot schema ${actual} does not match app schema ${expected}`);
  }
}

class FileNotFoundError extends Error {
  code = 'FILE_NOT_FOUND';
  constructor(public path: string) {
    super(`No file at path ${path}`);
  }
}

class LiveModeUnavailableError extends Error {
  code = 'LIVE_MODE_UNAVAILABLE';
  constructor(public reason: string) {
    super(`Live mode unavailable: ${reason}`);
  }
}
```

The web app catches `SnapshotSchemaError` and shows a "stale snapshot" banner rather than crashing.

### 5.5 Line → claim lookup

The "click a line → why" feature is a **pure in-process lookup**, not a data-layer call:

```typescript
// apps/web/src/lib/lineLookup.ts

export function findClaimsForLine(
  lineNumber: number,
  blame: BlameRange[],
  claims: Claim[]
): Claim[] {
  const range = blame.find(r => lineNumber >= r.start && lineNumber <= r.end);
  if (!range) return [];
  const rangeEvidenceIds = new Set(range.evidence_ids);
  return claims.filter(claim =>
    claim.evidence_ids.some(id => rangeEvidenceIds.has(id))
  );
}
```

No network call is made when a user clicks a line. This guarantees the `< 200 ms` NFR-2 target.

---

## 6. Evidence API

Evidence is not fetched by URL. It is embedded in the snapshot and looked up by ID in memory.

### 6.1 ID format

```
<type>:<identifier>[:<sub>]
```

| Type | Format | Example |
|---|---|---|
| Commit | `commit:<full_sha>` | `commit:a3f9c2b1d4e5f6a7b8c9…` |
| Pull request | `pr:<number>` | `pr:1234` |
| Issue | `issue:<number>` | `issue:567` |
| Review comment | `comment:pr:<pr_number>:c:<gh_comment_id>` | `comment:pr:1234:c:89` |
| Issue comment (P2) | `comment:issue:<number>:c:<gh_comment_id>` | `comment:issue:567:c:41` |

Rules: full SHA only; IDs are case-sensitive; same ID resolves to same item on every run.

### 6.2 Lookup

```typescript
// apps/web/src/lib/evidenceLookup.ts

export function findEvidence(
  id: string,
  evidence: Evidence[]
): Evidence | undefined {
  return evidence.find(e => e.id === id);
}
```

### 6.3 Highlighting the quote

When the evidence drawer opens, it highlights the claim's `quote` in the evidence `body` after whitespace normalization. The algorithm matches the same normalization used by the pipeline's `quoteCheck.ts`:

```typescript
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function findQuoteRange(quote: string, body: string): [number, number] | null {
  const nq = normalizeWhitespace(quote);
  const nb = normalizeWhitespace(body);
  const idx = nb.indexOf(nq);
  if (idx === -1) return null;
  return [idx, idx + nq.length];
}
```

Because both the pipeline and the web app use the same normalization, the highlight is guaranteed to match what the pipeline verified.

---

## 7. Error Handling Conventions

All APIs follow the same conventions:

1. **No stack traces in responses.** Stack traces go to stderr or the log file only.
2. **Errors carry a machine-readable code.** Every error response has an `error` field with a stable string value.
3. **User-facing messages are plain.** No jargon. Say "Try an example case" instead of "Retry with a smaller repository."
4. **HTTP status codes are meaningful.** 4xx for client errors, 5xx for server errors, 2xx only for real success.
5. **The pipeline never exits silently.** Every non-zero exit prints one JSON error line to stdout before exiting.

---

## 8. Versioning

### 8.1 Snapshot schema version

The snapshot JSON carries `schema_version` using `MAJOR.MINOR.PATCH`. The web app refuses to render claims from a snapshot whose `MAJOR` or `MINOR` differs from the app's own `SCHEMA_VERSION`.

### 8.2 Worker API version

The worker exposes its version in `GET /health`:

```
{
  "status": "ok",
  "apiVersion": "1.0",
  "liveModeEnabled": true
}
```

The web app checks `apiVersion` before calling `POST /analyze`. If the major version differs, it disables live mode and shows an honest message.

### 8.3 Backwards compatibility

- Adding a new optional field to a request or response is a MINOR change.
- Removing a field or changing its type is a MAJOR change.
- During the hackathon, MAJOR changes are handled by reset (delete snapshots, re-run pipeline, redeploy worker), never by in-place migration.

---

## 9. Rate Limits and Quotas

| API | Limit | Enforced by | On limit hit |
|---|---|---|---|
| Pipeline CLI (GitHub REST) | 5,000 req/hour with token | GitHub | Exponential backoff, then exit code 3 |
| Pipeline CLI (GitHub GraphQL) | Same quota as REST | GitHub | Same |
| Pipeline CLI (Groq) | Provider-specific RPM/TPM | Groq | Exponential backoff, then exit code 4 |
| Pipeline CLI (Gemini) | Provider-specific | Google | Exponential backoff, then exit code 4 |
| Worker `POST /analyze` | 5 req/min/IP | `express-rate-limit` | 429 with `retry_after_seconds` |
| Worker concurrent jobs | 1 | In-memory queue | 503 with `queue_full` |
| Worker daily cap | 50 | Counter | 429 with `daily_cap_reached` |

---

## 10. Security

| Concern | Mitigation |
|---|---|
| **Secrets in API responses** | Never. API keys and tokens never leave the server. |
| **Secrets in logs** | Never. Only step names, counts, and IDs are logged. |
| **SSRF via repo URL** | The worker accepts only `github.com/owner/repo`. The pipeline never accepts arbitrary URLs. |
| **Shell injection** | The pipeline calls `git` with an argument list, never a shell string. Owner and repo are validated against `^[a-zA-Z0-9_.-]+$`. |
| **XSS via PR/issue text** | The web app renders all third-party text as plain text. No `dangerouslySetInnerHTML`. |
| **Prompt injection** | Evidence is labeled as data. Output is constrained by schema. Claims need a verbatim quote or are removed. The model has no tools. |
| **CORS** | The worker only allows `ALLOWED_ORIGIN`. |
| **Resource abuse (live mode)** | Size limits, timeouts, one job at a time, per-IP rate limit, daily cap, `LIVE_MODE_ENABLED` switch. |
| **Token scope** | GitHub token is read-only, no special permissions. |

---

## 11. End-to-End Example

### 11.1 Building a case (offline)

```bash
npm run pipeline -- --repo axios/axios --top 8 --verbose
```

Produces:
- `.cache/coldcase.db` (updated)
- `data/demo/axios__axios.json` (new snapshot)

### 11.2 Browsing a case (static)

```
GET /c/axios/axios              → CasePage reads data/demo/axios__axios.json
GET /c/axios/axios/f/lib/adapters/http.js → FilePage reads same snapshot, filters to one file
```

No network calls to GitHub, LLMs, or a database. The snapshot is bundled into the web build and served by Vercel's CDN.

### 11.3 Live analysis (P1)

```
POST https://worker.example.com/analyze
Body: { "repoUrl": "https://github.com/sindresorhus/is-odd" }
→ 202 { "jobId": "550e8400-…" }

GET https://worker.example.com/job/550e8400-…
→ 200 { "status": "running", "step": "linking" }

GET https://worker.example.com/job/550e8400-…
→ 200 { "status": "done", "caseUrl": "/c/sindresorhus/is-odd" }
```

The web app navigates to `/c/sindresorhus/is-odd` and renders the freshly generated case.

---

## 12. Appendix: Shared TypeScript Types

```typescript
// packages/core/src/schemas.ts

export type EvidenceType =
  | 'commit' | 'pull_request' | 'issue' | 'review_comment' | 'issue_comment';

export interface Evidence {
  id: string;
  type: EvidenceType;
  url: string;
  title?: string;
  body: string;
  author?: string;
  created_at?: string;
}

export type ConfidenceTier = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
export type StatedOrInferred = 'stated' | 'inferred';

export interface Claim {
  claim_id: string;
  text: string;
  evidence_ids: string[];
  confidence_tier: ConfidenceTier;
  stated_vs_inferred: StatedOrInferred;
  quote?: string;
  line_range?: { start: number; end: number };
}

export interface Narrative {
  schema_version: string;
  path: string;
  source_ref: string;
  sampled_history: boolean;
  claims: Claim[];
}

export interface BlameRange {
  start: number;
  end: number;
  sha: string;
  evidence_ids: string[];
}

export interface Synthesis {
  schema_version: string;
  source_ref: string;
  eras: Array<{
    name: string;
    date_range: { start: string; end: string };
    summary: string;
    claim_ids: string[];
  }>;
  key_decisions: Array<{
    text: string;
    claim_ids: string[];
  }>;
}

export interface Snapshot {
  schema_version: string;
  generated_at: string;
  repo: {
    owner: string;
    name: string;
    default_branch: string;
    last_fetched_sha: string;
  };
  synthesis: Synthesis;
  stats: {
    files_analyzed: number;
    files_total: number;
    confidence_mix: Record<ConfidenceTier, number>;
  };
  files: Array<{
    path: string;
    hotspot_rank: number;
    change_count: number;
    sampled_history: boolean;
    content: string;
    blame: BlameRange[];
    narrative: Narrative;
  }>;
  evidence: Evidence[];
}
```

---

**End of API Specifications**