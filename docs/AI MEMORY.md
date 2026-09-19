# ColdCase — AI Memory

| | |
|---|---|
| **Version** | 1.2 |
| **Date** | September 19, 2026 |
| **Status** | Living document — update after every working session |
| **Purpose** | Persistent context for AI agents across sessions. Read this first, after `AI_RULES.md`. |
| **Companion files** | `AI_RULES.md` (binding rules), `DECISIONS.md` (one-line decision log), `PRD.md`, `TRD.md`, `System-Architecture.md`, `CACHE_SCHEMA.md`, `API_SPECIFICATIONS.md` |

> **How to use this file.** `AI_RULES.md` tells you *what you must not do*. This file tells you *what has already happened* so you do not re-litigate settled questions, re-discover known bugs, or rebuild things that already exist. Update the relevant sections at the end of every session. Keep entries short and factual. Delete stale entries rather than letting them rot.

---

## 1. Current State (End of Session)

- **Monorepo Scaffold**: Complete (`apps/web`, `apps/worker`, `packages/core`, `packages/pipeline`). All work within npm workspaces.
- **`packages/core`**: 100% complete with schemas, `confidence.ts`, `quoteCheck.ts`, `junkMessages.ts`, `ignorePatterns.ts`, and 18 passing Vitest unit tests.
- **`packages/pipeline`**: 100% complete with 14 pipeline steps, LLM wrappers for Groq and Gemini, SQLite persistence via `sql.js` (WebAssembly SQLite), JSON snapshot exporter, and 8 automated trust invariant checks. Passes dry-run and full snapshot generation.
- **`apps/web`**: 100% complete React 18 + Vite + Tailwind SPA with LandingPage, CasePage, FilePage, CodeView, ClaimCard, LineWhyPanel, EvidenceDrawer, and offline demo snapshots. Production build (`tsc && vite build`) passes cleanly. Features a robust data layer that gracefully degrades from live worker analysis to static bundled snapshots.
- **`apps/worker`**: 100% complete Express server with `/health`, `POST /analyze`, `GET /job/:jobId`, and `GET /snapshot/:owner/:repo` endpoints. Includes robust rate-limiting and background job tracking.
- **`eval`**: 100% complete evaluation harness (`eval/run.ts`) executing invariant checks and generating `eval/RESULTS.md`. All 7 trust invariants pass on real-world repositories (e.g. `sindresorhus/is`, `expressjs/express`).

---

## 2. Settled decisions (do not re-open)

| # | Decision | Rationale | Recorded in |
|---|---|---|---|
| 1 | Product name is **ColdCase** | Chosen over "Code Archaeologist" | `PRD.md` §1 |
| 2 | Storage is **SQLite + JSON files**, not Postgres/Supabase/Redis | Pipeline, not CRUD; no sessions; offline demo | `CACHE_SCHEMA.md` header note |
| 3 | `System-Architecture.md`'s Supabase proposal is **superseded** | See above | `CACHE_SCHEMA.md`, `AI_RULES.md` §2.1 |
| 4 | Frontend is **React + Vite + Tailwind SPA**, not Next.js | No server-side features needed; pipeline does backend work | `System-Architecture.md` §1.1 |
| 5 | Routing is **React Router with loaders**, not TanStack Query / Redux | Small app, few requests | `System-Architecture.md` §1.1 |
| 6 | Code viewer is **plain line rendering**, not Monaco/CodeMirror | Read-only; accessibility easier with real buttons | `System-Architecture.md` §2.5 |
| 7 | Per-file stories use **Groq**; case summary uses **Gemini** | Speed vs. long-context split | `TRD.md` §6.4 |
| 8 | Confidence is a **pure function** in `packages/core/src/confidence.ts` | Deterministic, testable, never self-reported | `TRD.md` §5.1 |
| 9 | Quote check is a **whitespace-normalized substring match** | Deterministic; no fuzzy matching, no embeddings | `TRD.md` §5.2 |
| 10 | Evidence IDs use **full 40-char SHA** for commits | Short SHAs are ambiguous | `CACHE_SCHEMA.md` §C |
| 11 | Confidence tiers are **HIGH / MEDIUM / LOW / NONE** | Uppercase, stable strings | `CACHE_SCHEMA.md` §D |
| 12 | Snapshot filename format is `<owner>__<repo>.json` | Double underscore; slash not filesystem-safe | `API_SPECIFICATIONS.md` §3.1 |
| 13 | Demo day runs with `VITE_DATA_SOURCE=static` | Guarantees offline demo | `TRD.md` §7.2 |
| 14 | SQLite backend uses **sql.js** (WebAssembly) | Cross-platform zero-compilation Node 24 support | `DECISIONS.md` |

---

## 5. Session log

### 2026-09-19 — Production Launch & Live API Wiring
- **Done**: Wired full `.env` loading and safety checks into the pipeline CLI. Completed Express worker with rate-limiting, CORS, daily caps, job polling, and snapshot serving (`GET /snapshot/:owner/:repo`). Fully integrated Live Mode in the web app, allowing users to analyze any public GitHub repo on the fly.
- **Verified**: Ran the full AI pipeline on two real public repos (`sindresorhus/is` and `expressjs/express`) end-to-end. All trust invariants passed with 100% precision. `npm run eval` successfully generated the final empirical results. All tests and monorepo builds are green.
- **Learned**: WebAssembly `sql.js` has a known assertion crash when the Node process exits on Windows. We must check JSON outputs and stdout step logs to verify success rather than relying on `$LASTEXITCODE == 0`.
- **Next**: Demo day.

---

**End of AI Memory**