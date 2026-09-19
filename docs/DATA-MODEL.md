# ColdCase — Data Model

ColdCase is a forensic analysis pipeline for code. It reads a repository's git history and GitHub metadata, builds an evidence ledger, generates per-file narratives, verifies them deterministically, and exports self-contained JSON snapshots that a read-only web app renders.

This document describes every piece of data ColdCase stores, generates, or displays. It is the single reference for the shape of a repository, a case, a file, a claim, and the evidence behind it. Storage is SQLite (live cache) plus JSON files (demo artifacts). There is no server-based database, no user accounts, and no sessions.

---

## 1. Vocabulary

| Term | Meaning |
|---|---|
| **Case** | An analyzed repository at a pinned commit |
| **Case file** | The story for one source file inside a case |
| **Evidence** | A commit, pull request, issue, or comment that supports a finding |
| **Receipt** | A link from a claim to its evidence |
| **Claim** | A single statement about why a piece of code exists |
| **Confidence** | A tier computed by code from evidence facts, never self-reported by an LLM |
| **Ledger** | The normalized set of evidence items with stable IDs |
| **Snapshot** | A self-contained JSON file that bundles everything one case needs |
| **Hotspot** | A file with high change frequency, recency, or author involvement |

---

## 2. The two storage layers

ColdCase stores data in two layers with different lifetimes and different consumers.

**Live cache** — one SQLite file at `.cache/coldcase.db`. Owned by the pipeline. Holds normalized rows for every analyzed repository: commits, file history, blame, PRs, issues, review comments, hotspot rankings, narratives, repo synthesis, verification outcomes, and bookkeeping. Never read by the web app. Gitignored.

**Demo snapshots** — one JSON file per case at `data/demo/<owner>__<repo>.json`. Written by the pipeline's export step. Read by the web app at build time. Committed to the repo so the demo works with the network off.

The snapshot is the only boundary between the pipeline and the web app. If a piece of data is not in the snapshot, the web app cannot show it.

---

## 3. Entity relationships

`repositories` is the root of the live cache. Every other table hangs off it, either directly or through `narratives`.

| Parent | Child | Cardinality | Join key |
|---|---|---|---|
| `repositories` | `commits` | 1 → many | `repo_id` |
| `repositories` | `file_history` | 1 → many | `repo_id` |
| `repositories` | `blame` | 1 → many | `repo_id`, `path` |
| `repositories` | `prs` | 1 → many | `repo_id` |
| `repositories` | `issues` | 1 → many | `repo_id` |
| `repositories` | `review_comments` | 1 → many | `repo_id` |
| `repositories` | `hotspots` | 1 → many | `repo_id` |
| `repositories` | `narratives` | 1 → many | `repo_id`, `path` |
| `repositories` | `repo_synthesis` | 1 → 1 | `repo_id` |
| `narratives` | `verification` | 1 → many | `narrative_id` |

`cache_metadata` is standalone bookkeeping with no foreign keys.

---

## 4. Live cache tables

### 4.1 `repositories`

One row per analyzed repository. Root of every foreign key.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Surrogate key used by every child table |
| `owner` | TEXT | NOT NULL | GitHub owner or organization login |
| `name` | TEXT | NOT NULL | Repository name |
| `default_branch` | TEXT | NOT NULL | e.g. `main`, `master` |
| `last_fetched_sha` | TEXT | NULL | Commit SHA at the tip of `default_branch` on the last fetch |
| `fetched_at` | TEXT | NOT NULL | ISO 8601 UTC timestamp of the last successful fetch |

Unique constraint on `(owner, name)`. Index on `fetched_at` for cache-age checks.

### 4.2 `commits`

One row per commit reachable from the analyzed ref.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `repo_id` | INTEGER | NOT NULL, FK → `repositories.id` ON DELETE CASCADE | Composite PK part 1 |
| `sha` | TEXT | NOT NULL | Full 40-char SHA; composite PK part 2 |
| `author` | TEXT | NULL | Commit author as recorded by git |
| `message` | TEXT | NOT NULL | Full commit message (subject + body) |
| `committed_at` | TEXT | NOT NULL | ISO 8601 UTC |
| `files_changed` | INTEGER | NOT NULL DEFAULT 0 | Count of files touched in this commit |

Indexes on `(repo_id, committed_at)` for timeline queries, and `(repo_id, author)` for author-diversity scoring.

### 4.3 `file_history`

One row per `(repo, path)` the pipeline tracked. Rename chains live here so blame and history can follow a file across names.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `repo_id` | INTEGER | NOT NULL, FK → `repositories.id` ON DELETE CASCADE | Composite PK part 1 |
| `path` | TEXT | NOT NULL | Current path at the analyzed ref |
| `current_sha` | TEXT | NOT NULL | Commit SHA of the file at the analyzed ref |
| `rename_history` | TEXT | NOT NULL DEFAULT `'[]'` | JSON array of rename events |
| `change_count` | INTEGER | NOT NULL DEFAULT 0 | Commits touching this path (rename-aware) |

Index on `(repo_id, change_count DESC)` for hotspot ranking, and `(repo_id, current_sha)` to join back to commits.

`rename_history` is an ordered array, oldest to newest, of rename events:

```
[
  {
    "old_path": "src/legacy/util.js",
    "new_path": "src/util.js",
    "commit_sha": "a3f9c2b1…",
    "renamed_at": "2021-04-12T09:14:00Z"
  }
]
```

An empty array means the file has never been renamed.

### 4.4 `blame`

Line-level attribution for every analyzed file. This is the source of truth for "click a line → why". The web app never asks an LLM about line numbers; it looks up the blame row and follows `commit_sha` to evidence.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `repo_id` | INTEGER | NOT NULL, FK → `repositories.id` ON DELETE CASCADE | Composite PK part 1 |
| `path` | TEXT | NOT NULL, FK → `file_history.path` (composite) | Composite PK part 2 |
| `line_number` | INTEGER | NOT NULL | 1-based line number at the analyzed ref |
| `commit_sha` | TEXT | NOT NULL | SHA of the last commit that changed this line |
| `author` | TEXT | NULL | Blame author, denormalized for display |
| `content` | TEXT | NOT NULL | The line's text at the analyzed ref |

Index on `(repo_id, commit_sha)` to find every line a commit touched. This is the largest table; the hotspot cap keeps it bounded.

### 4.5 `prs`

Pull request metadata used as evidence. PR bodies are the highest-value evidence source for the HIGH confidence tier.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `repo_id` | INTEGER | NOT NULL, FK → `repositories.id` ON DELETE CASCADE | Composite PK part 1 |
| `number` | INTEGER | NOT NULL | GitHub PR number; composite PK part 2 |
| `title` | TEXT | NULL | PR title |
| `body` | TEXT | NOT NULL DEFAULT `''` | PR description, template boilerplate included |
| `merged_at` | TEXT | NULL | ISO 8601 UTC; NULL means not merged |
| `author` | TEXT | NULL | PR author login |
| `linked_commits` | TEXT | NOT NULL DEFAULT `'[]'` | JSON array of full SHA strings |

Index on `(repo_id, merged_at DESC)` for chronological ordering.

### 4.6 `issues`

Issue metadata used as evidence, especially for bug-fix rationale.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `repo_id` | INTEGER | NOT NULL, FK → `repositories.id` ON DELETE CASCADE | Composite PK part 1 |
| `number` | INTEGER | NOT NULL | GitHub issue number; composite PK part 2 |
| `title` | TEXT | NULL | Issue title |
| `body` | TEXT | NOT NULL DEFAULT `''` | Issue body |
| `state` | TEXT | NOT NULL, CHECK IN (`'open'`, `'closed'`) | Issue state at fetch time |
| `linked_commits` | TEXT | NOT NULL DEFAULT `'[]'` | JSON array of full SHA strings |

Index on `(repo_id, state)` to filter closed issues for evidence.

### 4.7 `review_comments`

Inline PR review comments. Optional in the MVP (P1) but the schema is ready so no migration is needed when the feature lands.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Local surrogate key |
| `repo_id` | INTEGER | NOT NULL, FK → `repositories.id` ON DELETE CASCADE | |
| `pr_number` | INTEGER | NOT NULL, FK → `prs.number` (composite) | |
| `author` | TEXT | NULL | Commenter login |
| `body` | TEXT | NOT NULL | Comment text |
| `path` | TEXT | NULL | File the comment is anchored to; NULL for general comments |
| `line` | INTEGER | NULL | Line number the comment is anchored to |
| `created_at` | TEXT | NOT NULL | ISO 8601 UTC |
| `gh_comment_id` | TEXT | NULL | GitHub's comment ID, used to dedupe on re-fetch |

Unique constraint on `(repo_id, gh_comment_id)` so re-fetches are idempotent. Indexes on `(repo_id, pr_number)` and `(repo_id, path)`.

### 4.8 `hotspots`

The ranked, filtered list of files the pipeline decided to analyze.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `repo_id` | INTEGER | NOT NULL, FK → `repositories.id` ON DELETE CASCADE | Composite PK part 1 |
| `path` | TEXT | NOT NULL | Composite PK part 2 |
| `change_count` | INTEGER | NOT NULL | Commits touching this path (rename-aware) |
| `rank` | INTEGER | NOT NULL | 1 = highest priority; ties broken by recency |
| `selected_for_analysis` | INTEGER | NOT NULL DEFAULT 0, CHECK IN (0, 1) | 1 if within the top-N cutoff |

Indexes on `(repo_id, rank)` and `(repo_id, selected_for_analysis)`. Non-selected files stay in the table so the UI can report "top N of M files analyzed" without a second pass over git.

### 4.9 `narratives`

The generated story for one file. `narrative_json` is the only place claim text, evidence references, confidence, and stated-vs-inferred labels live together.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Referenced by `verification.narrative_id` |
| `repo_id` | INTEGER | NOT NULL, FK → `repositories.id` ON DELETE CASCADE | |
| `path` | TEXT | NOT NULL, FK → `hotspots.path` (composite) | |
| `narrative_json` | TEXT | NOT NULL | JSON object described below |
| `model_used` | TEXT | NOT NULL | Provider + model identifier, e.g. `groq:llama-3.3-70b` |
| `generated_at` | TEXT | NOT NULL | ISO 8601 UTC |

Unique constraint on `(repo_id, path)`: one narrative per file per repository. Index on `(repo_id, generated_at)` to detect stale narratives.

`narrative_json` shape:

```
{
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
```

Required fields per claim: `claim_id`, `text`, `evidence_ids`, `confidence_tier`, `stated_vs_inferred`. Optional: `quote` (required when `stated_vs_inferred` is `stated`) and `line_range`.

### 4.10 `repo_synthesis`

One row per repository: the whole-repo narrative produced from verified claims only.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `repo_id` | INTEGER | PRIMARY KEY, FK → `repositories.id` ON DELETE CASCADE | One synthesis per repo |
| `timeline_json` | TEXT | NOT NULL | JSON object described below |
| `model_used` | TEXT | NOT NULL | e.g. `gemini:gemini-1.5-pro` |
| `generated_at` | TEXT | NOT NULL | ISO 8601 UTC |

`timeline_json` shape:

```
{
  "schema_version": "1.0.0",
  "source_ref": "owner/repo@a3f9c2b1",
  "eras": [
    {
      "name": "Initial extraction",
      "date_range": { "start": "2019-01-01", "end": "2020-06-30" },
      "summary": "The module was split out of the monolith.",
      "claim_ids": ["clm_01H…", "clm_01H…"]
    }
  ],
  "key_decisions": [
    {
      "text": "Retries were capped at three to avoid thundering herds.",
      "claim_ids": ["clm_01H…"]
    }
  ]
}
```

Every `claim_ids` entry must resolve to a claim inside a narrative for the same `repo_id`. The synthesis step drops any reference that does not.

### 4.11 `verification`

Per-claim verification outcomes. One row per `(narrative, claim)`. This is the audit log for the trust story and the source of the eval numbers.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `narrative_id` | INTEGER | NOT NULL, FK → `narratives.id` ON DELETE CASCADE | |
| `claim_id` | TEXT | NOT NULL | Matches `claims[].claim_id` inside the narrative JSON |
| `verdict` | TEXT | NOT NULL, CHECK IN (`'supported'`, `'partial'`, `'unsupported'`) | |
| `reason` | TEXT | NULL | One-line explanation from the verifier |
| `verified_at` | TEXT | NOT NULL | ISO 8601 UTC |

Unique constraint on `(narrative_id, claim_id)`. Index on `(verdict)` to aggregate eval statistics.

The deterministic quote check is not stored here. A claim either passes it and is stored, or fails and is dropped before persisting. This table is for the LLM entailment verifier (P1) and the eval harness.

### 4.12 `cache_metadata`

Key/value bookkeeping for the pipeline: rate-limit state, model versions, prompt versions, schema version, and last-run timestamps.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `key` | TEXT | PRIMARY KEY | Dotted namespace, e.g. `schema.version` |
| `value` | TEXT | NOT NULL | Free-form string; JSON-encode structured values |
| `updated_at` | TEXT | NOT NULL | ISO 8601 UTC |

Reserved keys written by the pipeline:

| Key | Value shape | Purpose |
|---|---|---|
| `schema.version` | `"1.0.0"` | Cache schema version |
| `prompt.version` | `"2026-09-19.1"` | Bump forces narrative regeneration |
| `model.groq` | `"llama-3.3-70b-versatile"` | Model used for per-file stories |
| `model.gemini` | `"gemini-1.5-pro"` | Model used for synthesis |
| `ratelimit.github.remaining` | `"4821"` | Last observed GitHub remaining quota |
| `ratelimit.github.reset_at` | ISO 8601 | GitHub quota reset time |
| `ratelimit.groq.reset_at` | ISO 8601 | Groq quota reset time |
| `run.last_completed_at` | ISO 8601 | Last successful pipeline run |
| `run.last_repo` | `"owner/repo@a3f9c2b1"` | Last analyzed ref (for debugging) |

---

## 5. The snapshot format

Location: `data/demo/<owner>__<repo>.json`. One file per case. Self-contained. No joins, no foreign lookups, no separate evidence file.

The double underscore separates owner and repo because a slash is not filesystem-safe on all platforms.

Top-level shape:

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
  "synthesis": { … },
  "stats": {
    "files_analyzed": 10,
    "files_total": 412,
    "confidence_mix": { "HIGH": 5, "MEDIUM": 3, "LOW": 2, "NONE": 0 }
  },
  "files": [ … ],
  "evidence": [ … ]
}
```

Each entry in `files[]`:

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
  "narrative": { … }
}
```

Each entry in `evidence[]`:

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

The snapshot deliberately does not include the full commit list or the full body of every PR. It includes only evidence that a claim actually cites, plus the commits referenced by blame ranges. This keeps the file small enough to commit for several repos.

---

## 6. Evidence IDs

Evidence IDs are strings, stable across runs, deterministic given `(owner, repo, SHA)`. They are the join key between the model's output, the evidence drawer, and the verification log.

Format: `<type>:<identifier>[:<sub>]`.

| Type | Format | Example |
|---|---|---|
| Commit | `commit:<full_sha>` | `commit:a3f9c2b1d4e5f6…` |
| Pull request | `pr:<number>` | `pr:1234` |
| Issue | `issue:<number>` | `issue:567` |
| Review comment | `comment:pr:<pr_number>:c:<gh_comment_id>` | `comment:pr:1234:c:89` |
| Issue comment (P2) | `comment:issue:<number>:c:<gh_comment_id>` | `comment:issue:567:c:41` |

Rules:

- Always use the full 40-character SHA. Short SHAs are ambiguous and would break stability across repos.
- PRs and issues share the same number space on GitHub but are separate tables, so the prefix disambiguates.
- The `c:` segment is literal and separates the parent object from the comment ID.
- IDs are case-sensitive.
- The same ID must resolve to the same evidence item on every run. If a PR body is edited on GitHub, the pipeline re-fetches and overwrites the row; the ID stays the same.
- Evidence IDs are not stored in their own table. They are computed at ledger-build time and embedded into `narrative_json.claims[].evidence_ids` and into the snapshot's `evidence[]` array.

Reverse mapping used by the line-lookup: a commit's evidence IDs are `commit:<sha>`, plus `pr:<n>` for every PR whose `linked_commits` contains the SHA, plus `issue:<n>` for every issue whose `linked_commits` contains the SHA, plus any review comments on those PRs (P1).

---

## 7. Confidence tiers

Four tiers, stored as uppercase strings in `narrative_json.claims[].confidence_tier` and in the snapshot's `stats.confidence_mix`. The names match the UI labels exactly.

| Tier | Meaning | Criteria (all must hold) |
|---|---|---|
| `HIGH` | Direct statement in a PR or issue | `stated_vs_inferred = "stated"`, at least one cited evidence item is a PR or issue with substantive body text, the claim's `quote` appears verbatim in that evidence after whitespace normalization, and the verifier (P1) says `supported` |
| `MEDIUM` | Direct statement in a descriptive commit message | `stated_vs_inferred = "stated"`, at least one cited evidence item is a commit whose message passes the junk-message heuristic, the `quote` is verified, and the verifier says `supported` or `partial` |
| `LOW` | Inferred from diff or context, or weak evidence | `stated_vs_inferred = "inferred"`, or the verifier returned `partial` with no substantive PR or issue evidence |
| `NONE` | No usable evidence | `evidence_ids` is empty, or the claim is `stated` but its quote failed verification (such claims are dropped before persisting; a `NONE` claim is the explicit "No recorded reason found" placeholder) |

Rules:

- The tier is computed by code, never self-reported by the LLM.
- A `NONE` claim must have `evidence_ids: []` and must not carry a `quote`.
- A `stated` claim without a verified quote is removed entirely, not downgraded, unless it is the explicit "No recorded reason found" placeholder.
- Tier names are stable strings. If the enum changes, bump the schema major version.

---

## 8. Claim kinds

Every claim carries `stated_vs_inferred`, a two-value enum.

**`stated`** — the evidence says it directly. A `stated` claim must include a verbatim `quote` from the cited evidence. The quote is checked deterministically against the evidence text before the claim is stored.

**`inferred`** — the claim is reasoned from a diff or from context, without a direct statement in the evidence. No quote is required. An inferred claim can never be `HIGH`.

A claim derived only from a diff is never `stated`. This is enforced by the verifier, not by convention.

---

## 9. TypeScript types

The shared types live in `packages/core/src/schemas.ts` and are imported by both the pipeline and the web app.

```typescript
export type EvidenceType =
  | 'commit'
  | 'pull_request'
  | 'issue'
  | 'review_comment'
  | 'issue_comment';

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

## 10. Invariants the data must satisfy

The pipeline's `invariants.ts` step checks these on every run. If any fails, the pipeline exits with a non-zero code and writes nothing to `data/demo/`. The web app assumes all of them are true.

1. Every claim with `confidence_tier != "NONE"` has at least one entry in `evidence_ids`.
2. Every ID in any `evidence_ids` array appears in the snapshot's top-level `evidence[]` array.
3. Every claim with `stated_vs_inferred == "stated"` has a non-empty `quote`.
4. Every `files[].blame[].sha` appears in `evidence[]` as `commit:<sha>`.
5. `stats.files_analyzed` equals `files.length`.
6. `stats.confidence_mix` totals equal the sum of `claims[].confidence_tier` across all files.

A snapshot that violates any invariant is rejected by the web app rather than rendered.

---

## 11. Cache invalidation

All invalidation is keyed by `(owner/repo, commit SHA)`. The SHA is the tip of `default_branch` at the time of the last successful fetch.

**When to re-fetch from GitHub:**

- `last_fetched_sha` is NULL (first run)
- Remote HEAD of `default_branch` differs from `last_fetched_sha`
- `fetched_at` is older than 24 hours and remote HEAD has changed
- `--force` flag on the pipeline CLI
- A commit in the analyzed window has no row in `commits`

If none of these fire, the pipeline reuses SQLite rows and skips GitHub entirely.

**When to re-run LLMs:**

- No `narratives` row exists for `(repo_id, path)`
- `prompt.version` in `cache_metadata` differs from the pipeline's current prompt version
- `model.groq` differs from the configured model
- The evidence set for a file changed (new commit or PR in the analyzed window)
- The file's `sampled_history` flag flipped
- `verification` has no row for a claim (P1)

Repo synthesis is regenerated whenever any narrative for that repo was regenerated.

**Cache layers:**

1. SQLite (`.cache/coldcase.db`) — the authoritative cache
2. GitHub HTTP cache (`.cache/github/`) — raw JSON responses keyed by URL hash
3. LLM response cache (`.cache/llm/`) — raw completions keyed by `hash(model + system + user)`
4. Demo snapshots (`data/demo/*.json`) — committed; regenerated from SQLite, never edited by hand

**Staleness contract for the UI:** every snapshot carries `generated_at` and `repo.last_fetched_sha`. The case overview renders "Analyzed at commit `<short sha>` on `<date>`." No automatic refresh; the pipeline owns freshness.

---

## 12. Schema versioning

`SCHEMA_VERSION` lives in `packages/core/src/schemas.ts` and uses `MAJOR.MINOR.PATCH`. It is written to `cache_metadata` under `schema.version` on every pipeline run, and into every snapshot under `schema_version`.

- **MAJOR** bump: breaking change. Column removed, type changed, or JSON shape changed incompatibly. Requires a cache reset.
- **MINOR** bump: additive change. New column, new optional JSON field. SQLite `ALTER TABLE ADD COLUMN` is enough; old rows get the default.
- **PATCH** bump: documentation or ordering changes with no structural effect.

On startup, the pipeline compares the stored version to `SCHEMA_VERSION`:

- Equal → proceed normally.
- Pipeline is MINOR-ahead → run additive migrations, update the stored version.
- Pipeline is MAJOR-ahead or the stored version is unknown → delete `.cache/coldcase.db`, delete `data/demo/*.json`, rebuild from git.

During the hackathon, the policy for MAJOR bumps is reset, do not migrate. A reset takes minutes and avoids writing throwaway migration code. After the event, real migration scripts can be introduced with a numbered `migrations/` folder.

The web app reads `schema_version` from each snapshot. If it does not match the version the app was built against, the app shows a stale-snapshot banner and refuses to render claims. It still renders the repo header and a link to rebuild.

---

## 13. What ColdCase does not store

| Not stored | Why |
|---|---|
| User accounts, sessions, auth tokens | No login, no sessions, no per-user state |
| Postgres / Redis / Supabase rows | Storage is SQLite plus JSON files |
| Raw git objects (packs, trees, blobs) | The cloned repo on disk is the source of truth |
| Full diff hunks | Consumed at prompt-packing time and discarded; storing them would balloon the cache |
| Embeddings or vector indexes | Semantic search is out of scope |
| Prompt transcripts | Prompts contain untrusted repo text and duplicate SQLite data |
| API keys, tokens, secrets | Keys live in `.env` and environment variables only |
| LLM confidence self-reports | Confidence is computed by code |
| Removed claims | Claims that fail the quote check are dropped before persisting |
| Analytics, telemetry, usage events | Out of scope for the MVP |
| Job queue or worker state | Live mode is a separate worker with its own in-memory queue |
| File contents for non-hotspot files | Only analyzed files' text is stored |
| Renamed-away paths as separate rows | Rename chains live inside `file_history.rename_history` |
| GitHub user profiles, avatars, emails | Only the author string as it appears in commits and PRs |
| Cross-repo or cross-case aggregates | Each case is independent |

---

**End of Data Model**