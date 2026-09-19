# ColdCase — AI Memory

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | September 19, 2026 |
| **Status** | Living document — update after every working session |
| **Purpose** | Persistent context for AI agents across sessions. Read this first, after `AI_RULES.md`. |
| **Companion files** | `AI_RULES.md` (binding rules), `DECISIONS.md` (one-line decision log), `PRD.md`, `TRD.md`, `System-Architecture.md`, `CACHE_SCHEMA.md`, `API_SPECIFICATIONS.md` |

> **How to use this file.** `AI_RULES.md` tells you *what you must not do*. This file tells you *what has already happened* so you do not re-litigate settled questions, re-discover known bugs, or rebuild things that already exist. Update the relevant sections at the end of every session. Keep entries short and factual. Delete stale entries rather than letting them rot.

---
---

## 2. Settled decisions (do not re-open)

These decisions have been made and recorded. Do not propose alternatives unless a spec contradicts itself.

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
| 14 | No authentication in the MVP | Public repos only; nothing to authenticate | `PRD.md` §15 |
| 15 | No live GitHub writes, ever | Read-only principle | `AI_RULES.md` §1.4 |
| 16 | Live mode (paste a URL) is **P1**, not P0 | Requires a worker with git installed | `PRD.md` §14.2 |
| 17 | Fixture repo is **mandatory** and built in hour 1 | Guarantees controlled demo + eval ground truth | `PRD.md` §14.3 |
| 18 | Cut from the bottom of the list, never from trust features | Trust is the differentiator | `AI_RULES.md` §4.2 |

If you want to change any of these, the change must be argued in `DECISIONS.md` first, and the spec must be updated in the same commit.

---

## 3. Known unknowns (need answers before they block work)

| # | Question | Blocks | Ask |
|---|---|---|---|
| 1 | Hackathon name, deadline, judging weights | Prioritization | Human |
| 2 | Final team size and roles | Task split | Human |
| 3 | Required sponsor technologies | Stack choices | Human |
| 4 | Demo format: live, recorded, or both? Deployed URL required? | Deployment plan | Human |
| 5 | Are private repos needed for the demo? | Auth work (currently out of scope) | Human |
| 6 | Which real repos become cases? | Pipeline run plan | Team, by hour 1 |
| 7 | Language for the pipeline: TypeScript (recommended) or Python? | Scaffolding | Team |
| 8 | Are Groq/Gemini free-tier quotas sufficient? | Pipeline run plan | Check provider consoles |
| 9 | Which Axios / Flask / Requests version to pin for demos? | Reproducibility | Team, by hour 1 |

Until these are answered, assume the recommended option and write the assumption in `DECISIONS.md`.

---

## 4. Landmines (things that have already bitten us or will)

### 4.1 Technical landmines

| # | Landmine | Mitigation |
|---|---|---|
| 1 | Full git clones are slow on large repos | Cap repo size; pick small/medium demo repos; check size before clone |
| 2 | `git blame` is slow on very long histories | Limit analyzed files to top N; cap commits per file |
| 3 | Free-tier LLMs rate-limit during long pipeline runs | Concurrency 2–3; exponential backoff; disk cache |
| 4 | Free-tier hosting sleeps (Supabase, Render) | Wake everything before the demo; `static` mode is the safety net |
| 5 | LLM JSON output is occasionally malformed | Zod + up to two retries + explicit "file failed" handling |
| 6 | Prompt token overflow on large files | Evidence packing with priorities and truncation markers; flag `sampled_history` |
| 7 | Squash merges hide PR links in commit text | API fallback `commits/{sha}/pulls`; accept lower confidence |
| 8 | Serverless hosts can't run `git clone` | Live mode is P1 and runs on a container host, not serverless |
| 9 | npm workspaces sometimes fight beginners | If it costs more than 30 minutes, use path aliases or copy `core/src` |
| 10 | `dangerouslySetInnerHTML` on PR text would be an XSS hole | Never use it; render as plain text |

### 4.2 Process landmines

| # | Landmine | Mitigation |
|---|---|---|
| 1 | Scope creep from "impressive" features | `AI_RULES.md` §4.1 closed feature list |
| 2 | Overclaiming in pitch copy | Traceability matrix in `Problem-statement-analysis.md` §1.5 |
| 3 | Accessibility and polish get squeezed at the end | Reserve hours 18–21; build semantic components from the start |
| 4 | Walking skeleton is not working by hour 9 | Stop all other work; fix it before anything else |
| 5 | Fixture repo takes longer than expected | Start it in hour 1; keep it to 20–40 commits |
| 6 | The 58% statistic gets misused | It measures program comprehension in general, not "why" questions |

---

## 5. Session log

Append one entry per working session. Newest at the top. Keep each entry to five lines or fewer.

**Format:**
```
### <date> — <session goal>
- Done: <what shipped>
- Blocked: <what is stuck and on what>
- Learned: <surprises, discoveries>
- Next: <single next action>
- Decisions: <links to DECISIONS.md entries added>
```

---

### 2026-09-19 — Spec drafting

- Done: Wrote PRD, TRD, System-Architecture, Cache-Schema, API-Specifications, AI-Rules, AI-Memory.
- Blocked: Nothing. Ready to scaffold.
- Learned: The original System-Architecture proposed Supabase; Cache-Schema supersedes it to SQLite + JSON. This needs to be reflected everywhere Supabase appears.
- Next: Scaffold monorepo; create the fixture repo.
- Decisions: None yet in `DECISIONS.md`.

---

## 6. Open threads (work in progress)

| # | Thread | Owner | State |
|---|---|---|---|
| 1 | Supabase references in `System-Architecture.md` need a "superseded" banner | Unassigned | Not started |
| 2 | Demo repo shortlist (Axios, Flask, Requests, Express — pick 2–3) | Team | Not started |
| 3 | Fixture repo design (planted cases + ground truth doc) | Team | Not started |
| 4 | `DECISIONS.md` file does not exist yet | Unassigned | Not started |
| 5 | `.env.example` does not exist yet | Unassigned | Not started |
| 6 | Eval labels CSV (`eval/labels.csv`) not started | Team | Not started |

---

## 7. Spec drift

Use this section to record where the specs and reality have diverged. When a spec is wrong, either fix the spec or record the drift here — never leave the contradiction silent.

| # | Spec says | Reality | Resolution |
|---|---|---|---|
| 1 | `System-Architecture.md` uses Supabase | Storage is SQLite + JSON | `CACHE_SCHEMA.md` supersedes; add a banner to System-Architecture |
| 2 | `Problem-statement-analysis.md` recommends Next.js | `System-Architecture.md` chose React + Vite | React + Vite wins; the Next.js line is stale |
| 3 | `TRD.md` §7.2 mentions Supabase fallback | Storage is SQLite + JSON | Update TRD to match CACHE_SCHEMA |

---

## 8. Fixture repo ground truth (to be filled in hour 1)

The fixture repo is load-bearing for both the demo and the eval. This section records its planted cases so the eval harness and any AI agent can check behavior against them.

| # | File | Planted behavior | Expected output |
|---|---|---|---|
| 1 | `src/delay.js` | A 200 ms delay with a PR explaining the race | `HIGH` claim citing the PR quote |
| 2 | `src/nullcheck.js` | A defensive null check with a linked issue | `HIGH` claim citing the issue quote |
| 3 | `src/duplicate.js` | A duplicated function with a descriptive commit | `MEDIUM` claim |
| 4 | `src/junk.js` | A file changed only by junk-message commits | `NONE` claim ("No recorded reason found") |
| 5 | `src/undocumented.js` | A change with no linked PR or issue, only a diff | `LOW` inferred claim |
| 6 | `src/false-claim.js` | A file where the LLM is likely to invent a reason | Claim removed by the quote check |

**Status:** Not created. This table is a placeholder for hour 1.

---

## 9. Eval results (to be filled at hour 21)

Every number in the pitch comes from `eval/RESULTS.md`. This section is a mirror so agents can see the current numbers without opening the file.

| Metric | Target | Actual |
|---|---|---|
| Quote check pass rate | 100% of displayed `stated` claims | — |
| Removal rate | Report only | — |
| Coverage (files with ≥1 HIGH or MEDIUM) | Report only | — |
| Fixture PR/issue links found | ≥ 90% | — |
| Human-checked precision (~20 claims) | ≥ 80% | — |
| Case page load time | < 2 s | — |
| Line click to Line Why | < 200 ms | — |
| Dry runs clean | 3 consecutive | — |

---

## 10. Agent handoff notes

Short notes for the next agent picking up work. Delete stale ones.

**For the next session:**

1. Before writing any code, read `AI_RULES.md` in full and `DECISIONS.md` if it exists.
2. The first concrete task is to scaffold the monorepo with npm workspaces and create the fixture repo. Do not start with the web app; the walking skeleton needs both ends.
3. The fixture repo is the highest-leverage artifact. If it is weak, the demo and the eval are weak. Budget two hours for it.
4. Do not touch the storage decision. It is settled.
5. When you finish a session, update §1 (state), §5 (session log), and §6 (open threads). If you made a decision, add it to `DECISIONS.md` and to §2 here.

**For the human collaborator:**

- The specs are complete. The next bottleneck is not writing more docs; it is writing the first working slice.
- Answer §3 questions 1–5 before hour 1 if possible. Question 6 can wait until hour 1.
- The one thing most likely to slip is accessibility. It is reserved for hours 18–21 in the plan; protect that block.

---

## 11. Glossary delta

Terms that came up during work and are not yet in the specs' glossaries. Add here; promote to `CACHE_SCHEMA.md` or `TRD.md` glossaries if they become load-bearing.

| Term | Working definition |
|---|---|
| Snapshot | The self-contained JSON file at `data/demo/<owner>__<repo>.json` |
| Ledger | The normalized set of evidence items with stable IDs, built in step 6 of the pipeline |
| Walking skeleton | The thinnest end-to-end slice: fixture repo → JSON → case file view with hard-coded claims |
| Planted case | A deliberately odd piece of code in the fixture repo with a known expected output |
| Demo freeze | The moment snapshots become read-only, before the final dry runs |

---

## 12. Change log for this file

| Date | Change | Author |
|---|---|---|
| 2026-09-19 | Initial version | — |

---

**End of AI Memory**

> **Reminder:** This file is only useful if it stays current. After every session, update §1, §5, §6, and §7. If you did not update this file, the next agent will re-discover the same things you did, and the team loses time.