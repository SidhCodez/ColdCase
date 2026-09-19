# AGENTS.md

> **This is the first file every AI agent reads when it opens this workspace.**
> It orients you, tells you what to read next, and states the constraints that are not negotiable.
> Do not suggest changes that violate anything in this file. If a constraint blocks you, stop and escalate.

---

## 1. Project identity

**ColdCase** is a forensic analysis pipeline for code.

**Tagline:** *git blame tells you who. ColdCase tells you why, with receipts.*

**One-sentence product:** ColdCase reads a repository's commits, pull requests, and issues to explain why code looks the way it does, and links every claim to its source.

**One-sentence architecture:** The pipeline runs offline, builds an evidence ledger, generates per-file narratives with an LLM, verifies them deterministically, and writes self-contained JSON snapshots. The web app reads those snapshots and never touches GitHub, LLMs, or git.

**What this is not:** a CRUD app, a chat assistant, an IDE plugin, a code editor, a replacement for reading history by hand, or a generic LLM wrapper.

---

## 2. Mandatory reading order

Read these files, in this order, before writing any code. Each one is short. Together they take about 30 minutes.

| Order | File | Why |
|---|---|---|
| 1 | `docs/AI_RULES.md` | Binding constraints. Not suggestions. |
| 2 | `docs/AI_MEMORY.md` | Current state, settled decisions, known landmines |
| 3 | `docs/DATA_MODEL.md` | Storage, tables, snapshot format, invariants |
| 4 | `docs/TRD.md` | Full technical spec: architecture, algorithms, pipeline, frontend |
| 5 | `docs/CACHE_SCHEMA.md` | The 12 SQLite tables and the JSON demo format |
| 6 | `docs/API_SPECIFICATIONS.md` | CLI, snapshot contract, worker HTTP API |
| 7 | `docs/EVIDENCE_MODEL.md` | How evidence is captured, linked, packed, verified |
| 8 | `docs/PROMPT_LIBRARY.md` | All LLM prompts and the versioning rules |
| 9 | `docs/ERROR_HANDLING.md` | Failure taxonomy and exit codes |
| 10 | `docs/UI_SPEC.md` | Screens, components, states |
| 11 | `docs/DESIGN.md` | Visual language and design tokens |
| 12 | `docs/EVALUATION.md` | How accuracy is measured |
| 13 | `docs/SECURITY.md` | Threat model and mitigations |

The `docs/PRD.md`, `docs/Problem-statement-analysis.md`, and `docs/System-Architecture.md` are reference documents. Read them when you need background, not as required reading.

**One caveat:** `docs/System-Architecture.md` proposes Supabase/Postgres. That decision was **superseded** by `docs/CACHE_SCHEMA.md`. Storage is SQLite + JSON files. Never use Supabase.

---

## 3. The five non-negotiable constraints

These are the load-bearing rules. Every other rule in this project derives from them. Do not violate them, do not work around them, do not "temporarily" break them.

### 3.1 Evidence or silence

No claim is shown to a user without a receipt (a commit, PR, issue, or comment link). If evidence is missing, the UI says **"No recorded reason found"** and does not speculate.

### 3.2 Confidence is computed by code, never self-reported by an LLM

The LLM writes prose. The code decides how much to trust it. `packages/core/src/confidence.ts` is the single source of truth. It is a pure function with unit tests for every tier.

### 3.3 Storage is SQLite + JSON files

- Live cache: `.cache/coldcase.db` (SQLite)
- Demo artifacts: `data/demo/<owner>__<repo>.json` (self-contained JSON)
- **No Postgres. No Supabase. No Redis. No MySQL. No MongoDB.**

### 3.4 Read-only

ColdCase never writes to a repository. The GitHub token is read-only. There are no code paths that push, comment, open issues, or merge.

### 3.5 The demo has no network

On demo day, `VITE_DATA_SOURCE=static`. The web app makes zero network calls after page load. Every screen renders from bundled snapshots. Any feature that would break when Wi-Fi is off is a bug.

---

## 4. Architecture at a glance

```
┌──────────────────────────────────────────────────────────────┐
│                    OFFLINE (pipeline on a laptop)            │
│                                                              │
│  GitHub repo → git clone → history + blame → PR/issue links  │
│    → evidence ledger → LLM stories → quote check             │
│    → confidence (code) → synthesis → invariants → SQLite     │
│                                                              │
│  Writes: .cache/coldcase.db  +  data/demo/*.json             │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                  ONLINE (web app, static build)              │
│                                                              │
│  Browser → Vercel (static files) → bundled snapshots         │
│                                                              │
│  No GitHub. No LLMs. No database. No network.                │
└──────────────────────────────────────────────────────────────┘
```

**Three runtime pieces:**

| Piece | Language | Where it runs | Priority |
|---|---|---|---|
| Pipeline | Node + TypeScript (`tsx`) | Laptop, offline | P0 |
| Web app | React + Vite + Tailwind | Vercel (static) | P0 |
| Worker | Express + Node | Container host | P1 |

---

## 5. Technology stack (the exact list)

Do not add to this list without a `DECISIONS.md` entry.

| Layer | Choice |
|---|---|
| Frontend framework | React 18 + TypeScript + Vite |
| Routing | React Router (data router, loaders) |
| Styling | Tailwind CSS with CSS-variable design tokens |
| UI primitives | shadcn/ui (Radix) — only `Sheet`, `Badge`, `Tooltip`, `Tabs` |
| Pipeline runtime | Node.js + TypeScript, run with `tsx` |
| Git access | `simple-git` (wraps the `git` CLI) |
| GitHub API | `octokit` (REST + GraphQL) |
| LLM (fast) | `groq-sdk` — per-file stories |
| LLM (long context) | `@google/genai` — case synthesis |
| Validation | Zod — LLM output, snapshots, env vars |
| Storage | SQLite (`better-sqlite3` or equivalent) + JSON files |
| Testing | Vitest (unit tests for `packages/core`) |
| Worker (P1) | Express |
| Hosting | Vercel (web), any container host for the worker |

**Deliberately not used:** Next.js, Redux, Zustand, TanStack Query, Prisma, Drizzle, Monaco, CodeMirror, D3, Chart libraries, Playwright, any authentication provider, any server-based database.

---

## 6. Repository layout

```
coldcase/
├─ AGENTS.md                       ← this file
├─ README.md
├─ DECISIONS.md                    ← one-line decision log
├─ .env.example                    ← variable names only, no secrets
├─ .gitignore                      ← .env, .cache/, .work/, node_modules
├─ .agents/
│  └─ rules/
│     └─ coldcase-constitution.md  ← workspace rules
│
├─ docs/                           ← all specifications
│
├─ apps/
│  ├─ web/                         ← React + Vite + Tailwind
│  │  ├─ public/snapshots/         ← copied from data/demo at build
│  │  └─ src/
│  │     ├─ pages/
│  │     ├─ components/
│  │     ├─ lib/                   ← data layer, lineLookup
│  │     └─ styles/index.css       ← design tokens
│  │
│  └─ worker/                      ← P1 only
│     ├─ Dockerfile
│     └─ src/server.ts
│
├─ packages/
│  ├─ core/                        ← pure functions + shared types
│  │  ├─ src/
│  │  │  ├─ schemas.ts
│  │  │  ├─ confidence.ts
│  │  │  ├─ quoteCheck.ts
│  │  │  ├─ junkMessages.ts
│  │  │  └─ ignorePatterns.ts
│  │  └─ tests/
│  │
│  └─ pipeline/                    ← the engine
│     └─ src/
│        ├─ cli.ts
│        ├─ run.ts
│        ├─ steps/                 ← ingest → invariants (14 steps)
│        ├─ llm/                   ← wrapper + prompts
│        ├─ github/client.ts
│        ├─ db/sqlite.ts
│        └─ util/
│
├─ data/demo/                      ← snapshots, committed
├─ fixtures/fixture-repo/          ← fixture ground truth
├─ eval/                           ← eval harness + RESULTS.md
└─ .cache/                         ← gitignored: coldcase.db, github/, llm/
```

---

## 7. Build order (walking skeleton first)

**Build a thin end-to-end slice early, then widen it.** Do not build features in isolation. Every step ends with a working end-to-end path.

| # | Step | Ends when |
|---|---|---|
| 1 | Monorepo skeleton | `npm install` works, `npm test` passes, `npm run dev` starts |
| 2 | Fixture repo | A real GitHub repo with 20–40 commits, real PRs/issues, ground truth written |
| 3 | Pipeline v0 | Runs `git log`/`git blame` on the fixture and writes JSON |
| 4 | UI v0 | Renders that JSON in a case file view with hard-coded claims |
| 5 | LLM added | Groq stories + Zod + quote check + confidence, end to end |
| 6 | Real repos | PR/issue linking + two real repos pre-computed |
| 7 | Full UI | Line Why, evidence drawer, case overview, synthesis |
| 8 | Eval | `eval/RESULTS.md` exists; pitch numbers come from it |
| 9 | Deploy | Vercel URL works; backup video recorded; three clean dry runs |

**Cut lines (absolute):**

- **Hour 9:** if the walking skeleton is not working end-to-end, stop all other work until it is.
- **Hour 14:** if the quote check and confidence function are not done, finish them before any visual polish.
- **Hour 18:** if any P0 UI is unfinished, drop the case overview polish first, then the landing mini-demo animation (keep it static).
- **Hour 21:** feature freeze. Only polish, eval, and demo prep after this.

---

## 8. Coding conventions

### 8.1 TypeScript

- `"strict": true` in every `tsconfig.json`.
- No `any`. Use `unknown` and narrow.
- No `// @ts-ignore`. Fix the type or write a Zod schema.

### 8.2 Validation

Every boundary crossing is validated with Zod:

- LLM output before it is stored
- Snapshot JSON before it is rendered
- Worker API request and response bodies
- Environment variables that affect behavior

A Zod parse failure is an error, not a warning.

### 8.3 Pure functions

The trust rules live in `packages/core`:

- `confidence.ts` — assigns HIGH / MEDIUM / LOW / NONE
- `quoteCheck.ts` — verifies a quote appears in cited evidence
- `junkMessages.ts` — classifies commit messages
- `ignorePatterns.ts` — files to skip during ranking

These have no network, no filesystem, no side effects. They have unit tests.

### 8.4 Evidence IDs

Format: `<type>:<identifier>[:<sub>]`

| Type | Example |
|---|---|
| Commit | `commit:a3f9c2b1d4e5f6...` (full 40-char SHA) |
| Pull request | `pr:1234` |
| Issue | `issue:567` |
| Review comment | `comment:pr:1234:c:89` |

Never use short SHAs. IDs are stable and deterministic given `(owner, repo, SHA)`.

### 8.5 LLM calls

Every LLM call goes through `packages/pipeline/src/llm/index.ts`. It handles JSON mode, low temperature, Zod validation, up to two retries, exponential backoff, and disk caching.

Never call `groq-sdk` or `@google/genai` directly from a step file. Never hardcode a model name; read `GROQ_MODEL` / `GEMINI_MODEL` from the environment.

### 8.6 Secrets

- Only variables prefixed `VITE_` reach the browser.
- `GITHUB_TOKEN`, `GROQ_API_KEY`, `GEMINI_API_KEY` are server-side only.
- Never log a secret. Never include one in an error message. Never write one to SQLite.

### 8.7 Untrusted text

All third-party text (PR bodies, issue bodies, commit messages) is rendered as plain text. Never use `dangerouslySetInnerHTML`. Never render Markdown from evidence.

### 8.8 Shell safety

Call `git` with an argument list, never a shell string. Validate `owner` and `repo` against `^[a-zA-Z0-9_.-]+$`.

### 8.9 Error handling

Every catch block either handles the error and logs why, or re-throws with context. Empty catches are forbidden. See `docs/ERROR_HANDLING.md` for exit codes and message rules.

---

## 9. The trust invariants

The pipeline's `invariants.ts` step checks these on every run. If any fails, the pipeline exits with a non-zero code and writes nothing to `data/demo/`.

1. Every claim with `confidence_tier != "NONE"` has at least one entry in `evidence_ids`.
2. Every evidence ID cited by any claim resolves to an item in the snapshot's `evidence[]` array.
3. Every claim with `stated_vs_inferred == "stated"` has a non-empty `quote`.
4. Every `quote` on a `stated` claim appears verbatim in at least one cited evidence item, after whitespace normalization.
5. Every `files[].blame[].sha` appears in `evidence[]` as `commit:<sha>`.
6. `stats.files_analyzed == files.length`.
7. `stats.confidence_mix` totals equal the sum of `claims[].confidence_tier` across all files.
8. The same `(owner, repo, SHA)` produces the same evidence IDs on repeated runs.

**Never disable the invariant check. Never relax an invariant to make a run pass. Fix the upstream step.**

---

## 10. Scope guardrails

### 10.1 In scope (P0)

- Explanatory landing page with offline mini-demo
- Offline pipeline producing case JSON
- Groq per-file stories with schema validation
- Deterministic quote check, code-computed confidence, removal of unsupported claims
- Gemini case synthesis from verified claims only
- Case library, case overview, case file view, Line Why panel, evidence drawer
- Confidence badges and honesty banners
- Fixture repo + 2 real repos (3 if time allows)
- Eval script and `eval/RESULTS.md`
- Deployed frontend and backup demo video

### 10.2 Stretch (P1), only after P0 is stable

- Live analysis for small repos (worker)
- Entailment verifier (LLM second check)
- PR review-comment evidence

### 10.3 Out of scope (never build)

- Chat assistant / "Ask the history"
- Fence Check ("is it safe to remove this?")
- IDE extension, CLI package, GitHub App, PR bot
- Private repos, OAuth, user accounts, teams
- Multi-language UI
- Payments, analytics dashboards
- Non-GitHub hosts
- Mobile-native apps
- Timeline charts, D3 visualizations
- Any server-based database

**If a feature is not in §10.1 or §10.2, it does not get built.**

---

## 11. Common commands

```bash
# Install
npm install

# Run the web app
npm run dev

# Run tests
npm test

# Run the pipeline on a repo
npm run pipeline -- --repo owner/repo --top 10

# Dry run (ingest → ledger, no LLM)
npm run pipeline -- --repo owner/repo --dry-run

# Force a full re-fetch (ignore cache)
npm run pipeline -- --repo owner/repo --force

# Run the eval harness
npm run eval

# Build the web app
npm run build
```

---

## 12. Session protocol

### At the start of every session

1. Read `docs/AI_MEMORY.md` §1 (current state), §2 (settled decisions), §6 (open threads).
2. Read `DECISIONS.md` to catch decisions made since the last session.
3. Check the git log for the last few commits to see what shipped.
4. Do not re-open settled decisions. Do not re-discover known landmines.

### During the session

- Work on one mission at a time. Do not mix feature work and refactoring.
- Update `DECISIONS.md` the moment you make a non-obvious call.
- Run `npm test` before every commit.
- If an error state is reachable, write the message and check it against `docs/ERROR_HANDLING.md` §8.2.

### At the end of every session

1. Update `docs/AI_MEMORY.md`:
   - §1 Current state
   - §5 Session log (one entry, five lines max)
   - §6 Open threads
   - §7 Spec drift (if any)
2. Commit `AI_MEMORY.md` and `DECISIONS.md` together with the code changes.
3. Leave the workspace in a state where `npm test` passes.

---

## 13. Anti-patterns (the hard NO list)

Do not do any of these. If a task seems to require one of them, stop and escalate.

- **No Postgres, Redis, MongoDB, Supabase, or any server-based database.**
- **No authentication, sessions, or user accounts.**
- **No chat interface. No free-text LLM queries.**
- **No IDE extension, CLI package, GitHub App, or PR bot.**
- **No writes to a repository, ever.**
- **No `dangerouslySetInnerHTML` anywhere.**
- **No `exec` or `execSync` with a shell string.**
- **No secrets in the browser bundle, logs, or error messages.**
- **No `console.log` in shipped code.** Use the structured logger.
- **No asking the LLM for a confidence score.**
- **No asking the LLM for line numbers.**
- **No claim without a receipt.**
- **No storing prompt transcripts.**
- **No hardcoded model names.**
- **No disabling the invariant check.**
- **No removing a planted failure from the fixture repo.**
- **No adding a dependency without a `DECISIONS.md` entry.**
- **No committing a failing test.**
- **No building a feature that is not in §10.1 or §10.2.**
- **No number in the pitch that is not from `eval/RESULTS.md`.**
- **No emojis in committed code or docs.**
- **No paraphrasing the fixed string "No recorded reason found."**

---

## 14. Fixed strings (do not paraphrase)

These strings appear in multiple places and are matched by the UI, the eval harness, and honesty banners. They must match exactly.

| String | Where |
|---|---|
| "No recorded reason found" | NONE claims, Line Why panel |
| "Every line has a reason. Find it." | Hero headline |
| "git blame tells you who. ColdCase tells you why, with receipts." | Tagline |
| "This story is based on a sample of the file's history." | Sampled-history banner |
| "This file has little recorded reasoning. ColdCase is showing what it found, not guessing." | Low-evidence banner |
| "This case covers the top {{N}} of {{M}} files." | Case-limited banner |

---

## 15. Escalation

Stop and ask the human collaborator when:

1. Two specs contradict each other.
2. A required behavior is impossible with the chosen stack.
3. A trust invariant cannot be satisfied.
4. A demo repo has too little evidence to demonstrate the product.
5. An API quota is exhausted before the pipeline has run on all demo repos.
6. The walking skeleton is not working by hour 9.
7. A P1 feature is tempting but P0 is not done.
8. You are about to break any rule in §13.

Escalation means: stop, write a one-paragraph summary of the conflict, ask. Do not work around the problem silently.

---

## 16. Quick reference card

| Question | Answer |
|---|---|
| What is this product? | A forensic analysis pipeline that explains why code looks the way it does, with receipts. |
| Where does storage live? | SQLite (`.cache/coldcase.db`) + JSON snapshots (`data/demo/`). |
| What is the demo path? | Landing → case → file → click line → evidence drawer → GitHub. |
| How is confidence computed? | `packages/core/src/confidence.ts` — pure function, unit-tested. |
| What if there is no evidence? | The UI says "No recorded reason found." |
| What is P0? | Landing + pipeline + quote check + confidence + case file view + evidence drawer + eval + deploy. |
| What is P1? | Live analysis, entailment verifier, review comments. |
| What is forbidden? | Any server-based database, any login, any write to a repo. |
| When do I cut features? | Hour 9 (walking skeleton), hour 14 (trust), hour 18 (polish), hour 21 (freeze). |
| Where do pitch numbers come from? | `eval/RESULTS.md`. Nowhere else. |
| Where do I record decisions? | `DECISIONS.md`, one line each. |
| Where do I record state? | `docs/AI_MEMORY.md`, updated every session. |

---

## 17. First mission

If you are starting a fresh session with no prior context, your first mission is:

```
Read AGENTS.md, .agents/rules/coldcase-constitution.md, and docs/AI_RULES.md.
Then scaffold the monorepo per docs/TRD.md §3.4:
- npm workspaces with apps/web, apps/worker, packages/core, packages/pipeline
- TypeScript strict mode
- Vitest with one passing test in packages/core
- React + Vite + Tailwind + React Router in apps/web
- Design tokens from docs/DESIGN.md §11 in apps/web/src/styles/index.css

Do not write feature code yet. Just the skeleton.
Run npm install and npm test to verify it works, then report back.
```

That is the whole first mission. Everything after that follows §7.

---

**End of AGENTS.md**

> This file is binding. When a prompt or a task conflicts with it, this file wins. When a rule blocks you, escalate rather than work around it. When you learn something new, write it in `DECISIONS.md` and `docs/AI_MEMORY.md` — not here. This file should be stable.