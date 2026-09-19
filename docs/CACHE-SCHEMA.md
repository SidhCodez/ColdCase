# ColdCase — Cache & Storage Schema

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | September 19, 2026 |
| **Status** | Ready for implementation |
| **Source documents** | `PRD.md`, `TRD.md`, `System-Architecture.md` |
| **Storage model** | SQLite (live cache) + JSON files (pre-computed demo artifacts) |
| **Scope** | Schema for the ColdCase pipeline cache and the demo snapshot format |

> **Note on storage choice.** The earlier `System-Architecture.md` proposed Supabase/Postgres. This document supersedes that decision for storage: ColdCase is a pipeline, not a CRUD app, and has no user accounts or sessions. The live cache is a single local SQLite file; the demo artifacts are self-contained JSON files. No Postgres, no Redis, no server-based database.

---

## Overview

ColdCase is a forensic analysis pipeline: it reads a repository's git history and GitHub metadata, builds an evidence ledger, generates per-file narratives with an LLM, verifies those narratives deterministically, and exposes the results to a read-only web app. Because the pipeline runs offline and the demo must never depend on live APIs, storage is split into two layers. The **live cache** is a single SQLite file (`.cache/coldcase.db`) holding the normalized results of every analyzed repository — commits, file history, blame, PRs, issues, review comments, hotspot rankings, generated narratives, repo synthesis, verification outcomes, and cache bookkeeping. The **demo snapshots** are self-contained JSON files (`data/demo/<owner>__<repo>.json`) that bundle everything a case needs so the web app can render with zero network calls. There is no user table, no session table, and no write path from the browser; the pipeline owns the SQLite file, and the JSON files are copied into the web build at deploy time.

---

## Entity-Relationship Summary

ColdCase has twelve tables. `repositories` is the root; every other table either hangs off it directly (`commits`, `file_history`, `blame`, `prs`, `issues`, `review_comments`, `hotspots`, `narratives`, `repo_synthesis`) or off a narrative (`verification`). `cache_metadata` is standalone bookkeeping.

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

---

## Table 1 — `repositories`

One row per analyzed repository. This is the root of every foreign key.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Surrogate key used by every child table |
| `owner` | TEXT | NOT NULL | GitHub owner or organization login |
| `name` | TEXT | NOT NULL | Repository name |
| `default_branch` | TEXT | NOT NULL | e.g. `main`, `master` |
| `last_fetched_sha` | TEXT | NULL | Commit SHA at the tip of `default_branch` on the last fetch |
| `fetched_at` | TEXT | NOT NULL | ISO 8601 UTC timestamp of the last successful fetch |

**Primary key:** `id`
**Foreign keys:** none
**Unique constraint:** `(owner, name)` — one row per repository
**Indexes:** `UNIQUE (owner, name)`; index on `fetched_at` for cache-age checks

---

## Table 2 — `commits`

One row per commit reachable from the analyzed ref. Stores the metadata the pipeline needs for evidence and for narrative prompts.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `repo_id` | INTEGER | NOT NULL, FK → `repositories.id` ON DELETE CASCADE | Composite PK part 1 |
| `sha` | TEXT | NOT NULL | Full 40-char SHA; composite PK part 2 |
| `author` | TEXT | NULL | Commit author name/email as recorded by git |
| `message` | TEXT | NOT NULL | Full commit message (subject + body) |
| `committed_at` | TEXT | NOT NULL | ISO 8601 UTC |
| `files_changed` | INTEGER | NOT NULL DEFAULT 0 | Count of files touched in this commit |

**Primary key:** `(repo_id, sha)`
**Foreign keys:** `repo_id → repositories.id`
**Indexes:**
- `(repo_id, committed_at)` — timeline queries, "sampled history" packing
- `(repo_id, sha)` — covered by PK
- `(repo_id, author)` — author-diversity scoring for hotspots

**JSON columns:** none

---

## Table 3 — `file_history`

One row per (repo, path) that the pipeline tracked. Renames are stored as a JSON chain so blame and history can follow a file across names.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `repo_id` | INTEGER | NOT NULL, FK → `repositories.id` ON DELETE CASCADE | Composite PK part 1 |
| `path` | TEXT | NOT NULL | Current path at the analyzed ref |
| `current_sha` | TEXT | NOT NULL | Commit SHA of the file at the analyzed ref |
| `rename_history` | TEXT | NOT NULL DEFAULT `'[]'` | JSON array (see shape below) |
| `change_count` | INTEGER | NOT NULL DEFAULT 0 | Number of commits that touched this path (rename-aware) |

**Primary key:** `(repo_id, path)`
**Foreign keys:** `repo_id → repositories.id`
**Indexes:**
- `(repo_id, change_count DESC)` — hotspot ranking
- `(repo_id, current_sha)` — join back to commits

**JSON column — `rename_history` shape:**
An ordered array (oldest → newest) of rename events. Empty array means the file has never been renamed.

```
[
  {
    "old_path": "src/legacy/util.js",
    "new_path": "src/util.js",
    "commit_sha": "a3f9c2…",
    "renamed_at": "2021-04-12T09:14:00Z"
  }
]
```

---

## Table 4 — `blame`

Line-level attribution for every analyzed file. This is the source of truth for the "click a line → why" feature: the web app never asks the LLM about line numbers, it looks up the blame row and follows `commit_sha` to evidence.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `repo_id` | INTEGER | NOT NULL, FK → `repositories.id` ON DELETE CASCADE | Composite PK part 1 |
| `path` | TEXT | NOT NULL, FK → `file_history.path` (composite) | Composite PK part 2 |
| `line_number` | INTEGER | NOT NULL | 1-based line number at the analyzed ref |
| `commit_sha` | TEXT | NOT NULL | SHA of the last commit that changed this line |
| `author` | TEXT | NULL | Blame author (denormalized for display) |
| `content` | TEXT | NOT NULL | The line's text at the analyzed ref |

**Primary key:** `(repo_id, path, line_number)`
**Foreign keys:**
- `repo_id → repositories.id`
- `(repo_id, path) → file_history(repo_id, path)`
- `(repo_id, commit_sha) → commits(repo_id, sha)` (soft — a line may point to a commit outside the analyzed window)

**Indexes:**
- `(repo_id, path, line_number)` — PK covers the line lookup
- `(repo_id, commit_sha)` — find every line a commit touched

**JSON columns:** none

> **Note on size.** This is the largest table. For a repo with 10 hotspot files averaging 400 lines, it holds ~4,000 rows; for larger repos it can grow into the tens of thousands. The pipeline caps analyzed files via the hotspot ranking, so the table stays bounded.

---

## Table 5 — `prs`

Pull request metadata used as evidence for `stated` claims. PR bodies are the highest-value evidence source for the HIGH confidence tier.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `repo_id` | INTEGER | NOT NULL, FK → `repositories.id` ON DELETE CASCADE | Composite PK part 1 |
| `number` | INTEGER | NOT NULL | GitHub PR number; composite PK part 2 |
| `title` | TEXT | NULL | PR title |
| `body` | TEXT | NOT NULL DEFAULT `''` | PR description, template boilerplate included |
| `merged_at` | TEXT | NULL | ISO 8601 UTC; NULL means not merged (closed or open) |
| `author` | TEXT | NULL | PR author login |
| `linked_commits` | TEXT | NOT NULL DEFAULT `'[]'` | JSON array of commit SHAs (see shape below) |

**Primary key:** `(repo_id, number)`
**Foreign keys:** `repo_id → repositories.id`
**Indexes:**
- `(repo_id, merged_at DESC)` — chronological ordering
- `(repo_id, number)` — covered by PK

**JSON column — `linked_commits` shape:**
A flat array of full SHA strings. The reverse mapping (commit → PR) is resolved at ledger-build time.

```
["a3f9c2b1…", "7e10d4aa…", "c0ffee12…"]
```

---

## Table 6 — `issues`

Issue metadata used as evidence, especially for bug-fix rationale. Linked from commits and PRs via closing keywords.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `repo_id` | INTEGER | NOT NULL, FK → `repositories.id` ON DELETE CASCADE | Composite PK part 1 |
| `number` | INTEGER | NOT NULL | GitHub issue number; composite PK part 2 |
| `title` | TEXT | NULL | Issue title |
| `body` | TEXT | NOT NULL DEFAULT `''` | Issue body |
| `state` | TEXT | NOT NULL, CHECK IN (`'open'`, `'closed'`) | Issue state at fetch time |
| `linked_commits` | TEXT | NOT NULL DEFAULT `'[]'` | JSON array of commit SHAs |

**Primary key:** `(repo_id, number)`
**Foreign keys:** `repo_id → repositories.id`
**Indexes:**
- `(repo_id, state)` — filter closed issues for evidence
- `(repo_id, number)` — covered by PK

**JSON column — `linked_commits` shape:**
Same shape as `prs.linked_commits`: a flat array of SHA strings.

---

## Table 7 — `review_comments`

Inline PR review comments. Optional in the MVP (P1) but included here so the schema does not need a migration when the feature lands.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Local surrogate key |
| `repo_id` | INTEGER | NOT NULL, FK → `repositories.id` ON DELETE CASCADE | |
| `pr_number` | INTEGER | NOT NULL, FK → `prs.number` (composite) | |
| `author` | TEXT | NULL | Commenter login |
| `body` | TEXT | NOT NULL | Comment text |
| `path` | TEXT | NULL | File the comment is anchored to (NULL for general comments) |
| `line` | INTEGER | NULL | Line number the comment is anchored to |
| `created_at` | TEXT | NOT NULL | ISO 8601 UTC |
| `gh_comment_id` | TEXT | NULL | GitHub's comment ID, used to dedupe on re-fetch |

**Primary key:** `id`
**Foreign keys:**
- `repo_id → repositories.id`
- `(repo_id, pr_number) → prs(repo_id, number)`

**Unique constraint:** `(repo_id, gh_comment_id)` — idempotent re-fetches
**Indexes:**
- `(repo_id, pr_number)` — load all comments for a PR
- `(repo_id, path)` — attach comments to a file's story

**JSON columns:** none

---

## Table 8 — `hotspots`

The ranked, filtered list of files the pipeline decided to analyze. This is what the case overview and the story generator both read.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `repo_id` | INTEGER | NOT NULL, FK → `repositories.id` ON DELETE CASCADE | Composite PK part 1 |
| `path` | TEXT | NOT NULL | Composite PK part 2 |
| `change_count` | INTEGER | NOT NULL | Commit count touching this path (rename-aware) |
| `rank` | INTEGER | NOT NULL | 1 = highest priority; ties broken by recency |
| `selected_for_analysis` | INTEGER | NOT NULL DEFAULT 0, CHECK IN (0, 1) | 1 if within the top-N cutoff |

**Primary key:** `(repo_id, path)`
**Foreign keys:**
- `repo_id → repositories.id`
- `(repo_id, path) → file_history(repo_id, path)`

**Indexes:**
- `(repo_id, rank)` — render the hotspot list in order
- `(repo_id, selected_for_analysis)` — filter to analyzed files only

**JSON columns:** none

> **Why keep non-selected files?** The case overview shows "Top N of M files analyzed" as an honesty banner. Keeping the full ranked list lets the UI report the true denominator without a second pass over git.

---

## Table 9 — `narratives`

The LLM-generated story for one file. `narrative_json` is the only place claim text, evidence references, confidence, and stated/inferred labels live together.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Referenced by `verification.narrative_id` |
| `repo_id` | INTEGER | NOT NULL, FK → `repositories.id` ON DELETE CASCADE | |
| `path` | TEXT | NOT NULL, FK → `hotspots.path` (composite) | |
| `narrative_json` | TEXT | NOT NULL | JSON object (shape below) |
| `model_used` | TEXT | NOT NULL | Provider + model identifier, e.g. `groq:llama-3.3-70b` |
| `generated_at` | TEXT | NOT NULL | ISO 8601 UTC |

**Primary key:** `id`
**Foreign keys:**
- `repo_id → repositories.id`
- `(repo_id, path) → hotspots(repo_id, path)`

**Unique constraint:** `(repo_id, path)` — one narrative per file per repository
**Indexes:**
- `(repo_id)` — load all narratives for a case
- `(repo_id, generated_at)` — detect stale narratives

**JSON column — `narrative_json` shape:**

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

**Required fields per claim (enforced by the pipeline, not by SQLite):**
- `claim_id` — stable within the narrative
- `text` — the claim as shown to the user
- `evidence_ids` — array of evidence IDs (may be empty only when `confidence_tier` is `NONE`)
- `confidence_tier` — one of `HIGH` / `MEDIUM` / `LOW` / `NONE`
- `stated_vs_inferred` — one of `stated` / `inferred`

**Optional fields:** `quote` (required when `stated_vs_inferred = stated`), `line_range`.

---

## Table 10 — `repo_synthesis`

One row per repository: the whole-repo narrative produced by the long-context model from verified claims only.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `repo_id` | INTEGER | PRIMARY KEY, FK → `repositories.id` ON DELETE CASCADE | One synthesis per repo |
| `timeline_json` | TEXT | NOT NULL | JSON object (shape below) |
| `model_used` | TEXT | NOT NULL | e.g. `gemini:gemini-1.5-pro` |
| `generated_at` | TEXT | NOT NULL | ISO 8601 UTC |

**Primary key:** `repo_id`
**Foreign keys:** `repo_id → repositories.id`
**Indexes:** none beyond the PK (one row per repo)

**JSON column — `timeline_json` shape:**

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

**Rule enforced by the pipeline:** every `claim_ids` entry must exist in a `narratives.narrative_json` claim for the same `repo_id`. The synthesis step drops any reference that does not resolve.

---

## Table 11 — `verification`

Per-claim verification outcomes. One row per (narrative, claim). This is the audit log for the trust story and the source of the eval numbers.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `narrative_id` | INTEGER | NOT NULL, FK → `narratives.id` ON DELETE CASCADE | |
| `claim_id` | TEXT | NOT NULL | Matches `claims[].claim_id` inside the narrative JSON |
| `verdict` | TEXT | NOT NULL, CHECK IN (`'supported'`, `'partial'`, `'unsupported'`) | |
| `reason` | TEXT | NULL | One-line explanation from the verifier |
| `verified_at` | TEXT | NOT NULL | ISO 8601 UTC |

**Primary key:** `id`
**Foreign keys:** `narrative_id → narratives.id`
**Unique constraint:** `(narrative_id, claim_id)` — one verdict per claim
**Indexes:**
- `(narrative_id)` — load verdicts for a file
- `(verdict)` — aggregate eval statistics

**JSON columns:** none

> **Note.** The deterministic quote check is not stored here — a claim either passes it (and is stored) or fails (and is dropped before persisting). This table is for the LLM entailment verifier (P1) and for the eval harness.

---

## Table 12 — `cache_metadata`

A key/value store for pipeline bookkeeping: rate-limit state, model versions, prompt versions, schema version, and last-run timestamps.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `key` | TEXT | PRIMARY KEY | Dotted namespace, e.g. `schema.version` |
| `value` | TEXT | NOT NULL | Free-form string; JSON-encode structured values |
| `updated_at` | TEXT | NOT NULL | ISO 8601 UTC |

**Primary key:** `key`
**Foreign keys:** none
**Indexes:** none beyond the PK

**Reserved keys (written by the pipeline):**

| Key | Value shape | Purpose |
|---|---|---|
| `schema.version` | `"1.0.0"` | Cache schema version (see §E) |
| `prompt.version` | `"2026-09-19.1"` | Prompt template version; bump forces narrative regeneration |
| `model.groq` | `"llama-3.3-70b-versatile"` | Model identifier used for per-file stories |
| `model.gemini` | `"gemini-1.5-pro"` | Model identifier used for synthesis |
| `ratelimit.github.remaining` | `"4821"` | Last observed GitHub remaining quota |
| `ratelimit.github.reset_at` | `"2026-09-19T01:00:00Z"` | GitHub quota reset time |
| `ratelimit.groq.reset_at` | `"2026-09-19T00:30:00Z"` | Groq quota reset time |
| `run.last_completed_at` | `"2026-09-19T00:12:44Z"` | Last successful pipeline run |
| `run.last_repo` | `"owner/repo@a3f9c2b1"` | Last analyzed ref (for debugging) |

---

## A. JSON Demo File Format

**Location:** `data/demo/<owner>__<repo>.json`
**Consumers:** the web app at build time (copied into `public/snapshots/`), the landing-page mini-demo, the eval harness.

Each file is **self-contained**: opening it should be enough to render the entire case with zero network calls. No joins, no foreign lookups, no separate evidence file.

**Top-level shape:**

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
  "synthesis": { /* timeline_json from Table 10 */ },
  "stats": {
    "files_analyzed": 10,
    "files_total": 412,
    "confidence_mix": { "HIGH": 5, "MEDIUM": 3, "LOW": 2, "NONE": 0 }
  },
  "files": [
    {
      "path": "src/util.js",
      "hotspot_rank": 1,
      "change_count": 27,
      "sampled_history": false,
      "content": "…full file text at the analyzed ref…",
      "blame": [
        { "start": 1, "end": 14, "sha": "a3f9c2b1…", "evidence_ids": ["commit:a3f9c2b1…", "pr:1234"] }
      ],
      "narrative": { /* narrative_json from Table 9 */ }
    }
  ],
  "evidence": [
    {
      "id": "commit:a3f9c2b1…",
      "type": "commit",
      "url": "https://github.com/owner/repo/commit/a3f9c2b1…",
      "title": "Fix race in flush()",
      "body": "…",
      "author": "octocat",
      "created_at": "2021-04-12T09:14:00Z"
    },
    {
      "id": "pr:1234",
      "type": "pull_request",
      "url": "https://github.com/owner/repo/pull/1234",
      "title": "Add delay to flush()",
      "body": "…",
      "author": "octocat",
      "created_at": "2021-04-12T09:14:00Z"
    }
  ]
}
```

**Field notes:**
- `schema_version` is mandatory and matches the value in `cache_metadata`.
- `evidence` is a flat array — the same shape the evidence drawer renders. It is the union of every commit, PR, issue, and review comment cited by any claim in the file.
- `files[].blame` uses the same range format as the `blame` table but grouped, so the web app does not have to rebuild ranges.
- The file deliberately does **not** include the full commit list or the full PR body of every PR — only evidence that a claim actually cites, plus the commits referenced by blame ranges. This keeps the file small enough to commit for several repos.
- The filename uses `__` (double underscore) as the separator because `owner/repo` contains a slash that is not filesystem-safe on all platforms.

---

## B. Cache Invalidation Rules

All invalidation is keyed by `(owner/repo, commit SHA)`. The SHA is the tip of `default_branch` at the time of the last successful fetch (`repositories.last_fetched_sha`).

### B.1 When to re-fetch from GitHub

| Trigger | Action |
|---|---|
| `last_fetched_sha` is NULL | Full fetch (first run) |
| Remote HEAD of `default_branch` differs from `last_fetched_sha` | Fetch new commits since `last_fetched_sha` |
| `fetched_at` older than 24 hours (configurable) | Re-check remote HEAD; fetch only if it changed |
| Manual `--force` flag on the pipeline CLI | Full re-fetch, ignoring cached refs |
| A commit in the analyzed window has no row in `commits` | Fetch the missing commit |

If none of the triggers fire, the pipeline reuses the SQLite rows and skips GitHub entirely.

### B.2 When to re-run LLMs

| Trigger | Action |
|---|---|
| No `narratives` row for `(repo_id, path)` | Generate the story |
| `prompt.version` in `cache_metadata` differs from the pipeline's current prompt version | Regenerate every narrative for every repo |
| `model.groq` differs from the configured model | Regenerate narratives |
| The evidence set for a file changed (new commit or PR in the analyzed window) | Regenerate that file's narrative only |
| The file's `sampled_history` flag flipped | Regenerate (evidence packing changed) |
| `verification` has no row for a claim (P1) | Run the entailment verifier |

Repo synthesis (`repo_synthesis`) is regenerated whenever **any** narrative for that repo was regenerated.

### B.3 Cache layers

1. **SQLite** (`.cache/coldcase.db`) — the authoritative cache. Survives between runs. Gitignored.
2. **GitHub HTTP cache** (`.cache/github/`) — raw JSON responses keyed by URL hash. Prevents re-hitting the API after a crash. Gitignored.
3. **LLM response cache** (`.cache/llm/`) — raw completions keyed by `hash(model + system + user)`. Prevents re-paying for the same prompt. Gitignored.
4. **Demo snapshots** (`data/demo/*.json`) — committed to the repo. Regenerated from SQLite by the export step; never edited by hand.

### B.4 Staleness contract for the UI

Every demo snapshot carries `generated_at` and `repo.last_fetched_sha`. The case overview renders a small line: *"Analyzed at commit `<short sha>` on `<date>`."* No automatic refresh; the pipeline owns freshness.

---

## C. Evidence ID Format

Evidence IDs are strings, stable across runs, and deterministic given `(owner, repo, SHA)`. They are the join key between the LLM's output, the evidence drawer, and the verification log. Format is `<type>:<identifier>[:<sub>]`.

| Evidence type | ID format | Example | Source table |
|---|---|---|---|
| Commit | `commit:<full_sha>` | `commit:a3f9c2b1d4e5f6…` | `commits.sha` |
| Pull request | `pr:<number>` | `pr:1234` | `prs.number` |
| Issue | `issue:<number>` | `issue:567` | `issues.number` |
| Review comment | `comment:pr:<pr_number>:c:<gh_comment_id>` | `comment:pr:1234:c:89` | `review_comments.gh_comment_id` |
| Issue comment (P2) | `comment:issue:<number>:c:<gh_comment_id>` | `comment:issue:567:c:41` | reserved |

**Rules:**
- Always use the **full** 40-character SHA for commits. Short SHAs are ambiguous and would break stability across repos.
- PRs and issues share the same number space on GitHub but are separate tables, so the prefix disambiguates.
- The `c:` segment is literal and separates the parent object from the comment ID.
- IDs are case-sensitive.
- The same ID must resolve to the same evidence item on every run. If a PR body is edited on GitHub, the pipeline re-fetches and overwrites the row; the ID stays the same.
- Evidence IDs are **not** stored in their own table. They are computed at ledger-build time from the four source tables and embedded into `narrative_json.claims[].evidence_ids` and into each demo snapshot's `evidence[]` array.

**Reverse mapping (used by line-lookup):**
Blame ranges carry evidence IDs derived from their `commit_sha`. For a given commit, the pipeline resolves its evidence IDs by:
1. Emitting `commit:<sha>`.
2. Adding `pr:<n>` for every PR in `prs.linked_commits` that contains the SHA.
3. Adding `issue:<n>` for every issue in `issues.linked_commits` that contains the SHA.
4. Adding any `comment:pr:…` rows whose `pr_number` is in step 2 (P1).

The web app never recomputes this; it reads the pre-built `evidence_ids` array from the snapshot's blame ranges.

---

## D. Confidence Tier Enum

Four tiers, stored as uppercase strings in `narrative_json.claims[].confidence_tier` and in the `stats.confidence_mix` counters. Tier names match the UI labels exactly.

| Tier | Meaning | Criteria (all must hold) |
|---|---|---|
| `HIGH` | Direct statement in a PR or issue | `stated_vs_inferred = "stated"` AND at least one cited evidence item is a PR or issue with substantive body text (passes template-stripping and minimum length) AND the claim's `quote` appears verbatim in that evidence (whitespace-normalized) AND the verifier (P1) says `supported` |
| `MEDIUM` | Direct statement in a descriptive commit message | `stated_vs_inferred = "stated"` AND at least one cited evidence item is a commit whose message passes the junk-message heuristic AND the `quote` is verified AND the verifier says `supported` or `partial` |
| `LOW` | Inferred from diff or context, or weak evidence | `stated_vs_inferred = "inferred"` OR the verifier returned `partial` with no substantive PR/issue evidence |
| `NONE` | No usable evidence | `evidence_ids` is empty OR the claim is `stated` but its quote failed verification (such claims are dropped before persisting; a `NONE` claim is the explicit "No recorded reason found" placeholder) |

**Rules:**
- The tier is computed by code (`packages/core/src/confidence.ts`), never self-reported by the LLM.
- A `NONE` claim must have `evidence_ids: []` and must not carry a `quote`.
- A `stated` claim without a verified `quote` is removed entirely (not downgraded to `NONE`) unless it is the explicit "No recorded reason found" placeholder.
- Tier names are stable strings; the enum is not expected to change during the hackathon. If it does, bump the schema major version (§E).

---

## E. Migration Strategy

ColdCase is a 24-hour hackathon build, so the migration strategy optimizes for speed of recovery over in-place data preservation. Everything in SQLite is regenerable from git + GitHub + LLMs, which makes "drop and re-run" the default escape hatch.

### E.1 Versioning

- A single `SCHEMA_VERSION` constant lives in `packages/core/src/schemas.ts` and uses `MAJOR.MINOR.PATCH`.
- It is written to `cache_metadata` under `schema.version` on every pipeline run.
- It is written into every demo snapshot under `schema_version`.
- **MAJOR** bump: breaking change (column removed, type changed, JSON shape changed incompatibly). Requires cache reset.
- **MINOR** bump: additive change (new column, new optional JSON field). SQLite `ALTER TABLE ADD COLUMN` is enough; old rows get the default.
- **PATCH** bump: documentation or ordering changes with no structural effect.

### E.2 On startup, the pipeline compares versions

1. Read `schema.version` from `cache_metadata`.
2. Compare to `SCHEMA_VERSION`:
   - **Equal** → proceed normally.
   - **Pipeline version is MINOR-ahead** → run additive migrations (see E.3) and update the stored version.
   - **Pipeline version is MAJOR-ahead or stored version is unknown** → print a one-line message, delete `.cache/coldcase.db`, and rebuild from git. This is expected and acceptable during the hackathon.
3. The web app reads `schema_version` from each snapshot. If it does not match the version the app was built against, the app shows a "stale snapshot" banner and refuses to render claims (it still renders the repo header and a link to rebuild).

### E.3 Additive migrations (MINOR)

- Add new columns with `DEFAULT` values so existing rows remain valid.
- Add new optional fields to JSON shapes; readers must tolerate their absence.
- Add new tables with `CREATE TABLE IF NOT EXISTS`; no data backfill required.
- New enum values (e.g. a new evidence type) are additive — old readers ignore unknown values.

### E.4 Breaking migrations (MAJOR)

During the hackathon, the policy is **reset, do not migrate**:

1. Stop the pipeline.
2. Delete `.cache/coldcase.db` and `.cache/llm/` (the GitHub cache can stay — it is keyed by URL).
3. Delete `data/demo/*.json`.
4. Re-run the pipeline for the fixture repo and the demo repos.
5. Commit the new snapshots.

A reset takes minutes and avoids writing throwaway migration code. After the hackathon, if the project continues, real migration scripts can be introduced with a `migrations/` folder and a numbered sequence.

### E.5 Demo-day freeze

Once the pipeline has produced the final snapshots for the demo:

- Treat `data/demo/*.json` as read-only. Do not re-run the pipeline unless a fatal bug is found.
- Pin `SCHEMA_VERSION` for the rest of the event.
- The web build in `VITE_DATA_SOURCE=static` mode ignores SQLite entirely, so a schema change after the freeze cannot affect the demo.

---

## What We Are NOT Storing and Why

| Not stored | Why |
|---|---|
| **User accounts, sessions, auth tokens** | ColdCase has no login, no sessions, and no per-user state. Everything is public repo data. There is nothing to authenticate. |
| **Supabase/Postgres/Redis rows** | The storage decision is SQLite + JSON files. A server-based database adds operational surface with no benefit for an offline pipeline. |
| **Raw git objects (packs, trees, blobs)** | The cloned repo on disk is the source of truth for git data. Re-cloning is cheap and avoids duplicating git's object store in SQLite. |
| **Full diff hunks** | Diffs are consumed at prompt-packing time and discarded. Only the evidence (commit message, PR/issue body) and the resulting claim survive. Storing diffs would balloon the cache for no query benefit. |
| **Embeddings / vector indexes** | Semantic search and "Ask the history" are out of scope. No embedding column, no vector store. |
| **Prompt transcripts (full system + user text)** | Prompts contain the packed evidence, which is already in SQLite. Storing the assembled prompt would duplicate it and risk leaking snippets of untrusted repo text into logs. Only `model_used` and `prompt.version` are kept. |
| **API keys, tokens, secrets** | Keys live in `.env` and environment variables only. No table has a column for a secret. Nothing sensitive is ever written to SQLite. |
| **LLM confidence self-reports** | Confidence is computed by code from evidence facts. The model's own "I am 90% sure" is never stored, because it is not trusted. |
| **Removed claims** | Claims that fail the deterministic quote check are dropped before persisting. The eval harness counts them in memory; they are not written to `narratives`. |
| **Analytics, telemetry, usage events** | Out of scope for the MVP. No page-view or click tables. |
| **Job queue / worker state** | Live mode (P1) is a separate Express worker with its own in-memory queue. The MVP pipeline is a synchronous CLI and needs no queue table. |
| **File contents for non-hotspot files** | Only analyzed files' text is stored (in the snapshot's `files[].content`). Non-hotspot files exist only as ranked rows in `hotspots`. |
| **Renamed-away paths as separate rows** | Rename chains live inside `file_history.rename_history`. Storing each historical path as its own row would duplicate blame and history for no gain. |
| **GitHub user profiles, avatars, emails** | Only the author string as it appears in commits and PRs is stored. No profile fetches, no email harvesting. |
| **Cross-repo or cross-case aggregates** | Each case is independent. There is no global index of "all repos analyzed" beyond the set of rows in `repositories`, and no cross-case statistics table. |

---

**End of Cache & Storage Schema**