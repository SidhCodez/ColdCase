# ColdCase — Product Requirements Document (PRD)

| | |
|---|---|
| **Version** | 0.1 (hackathon draft) |
| **Date** | September 19, 2026 |
| **Status** | Ready for team review |
| **Source** | `Problem-statement-analysis.md` (deep analysis of the Code Archaeologist concept) |
| **Scope of this PRD** | What we will build in ~24 hours, and what we will deliberately not build |
| **Owner / team** | `[TBD: team name, roles]` |

**How to read this PRD:** Every requirement is tagged **P0** (must ship for the demo), **P1** (ship only if P0 is done and stable), or **P2** (defer). Anything not tagged P0 is optional. If time runs short, cut from the bottom of the list, never from the trust features.

---

## 1. Product name

**ColdCase**

**Tagline:** *git blame tells you who. ColdCase tells you why, with receipts.*

**Vocabulary (used lightly in the UI; plain labels stay plain):**

| Term | Meaning |
|---|---|
| **Case** | An analyzed repository |
| **Case file** | The story for one source file |
| **Evidence** | A commit, pull request, issue, or comment that supports a finding |
| **Receipt** | A link from a finding to its evidence |
| **Confidence** | High / Medium / Low / None, computed by code from the evidence |

> Housekeeping: do a five-minute check of domain, GitHub org, and existing products named "ColdCase" before printing it on slides.

---

## 2. One-line product description

ColdCase investigates why code looks the way it does by reading a repository's commits, pull requests, and issues, and it links every finding to the source that proves it.

---

## 3. Problem statement

Every mature codebase contains code that looks wrong but exists for a reason: an odd null check, a duplicated function, a hardcoded delay. The reason is rarely in the file. It lives in a commit from years ago, a PR discussion, or a bug report, and the people who knew it have often left.

Developers pay for this. A field study of 78 professional developers over 3,148 working hours found they spend about 58% of their time on program comprehension (Xia et al., IEEE TSE, 2018). That figure covers comprehension in general, not only "why is this here?" questions, but it shows how expensive understanding code is. Existing tools help only partway:

- `git blame` shows who and when, not why.
- Commit messages are often terse, and the real reasoning sits in PRs, issues, and review threads.
- Many AI code explainers focus on what code does today and usually don't show where their reasoning came from.

The result is a **Chesterton's Fence** problem: developers either delete code that was protecting against something, or leave it alone forever because they're afraid to touch it.

**Problem in one sentence:** *A developer who needs to change unfamiliar code cannot cheaply find out why it is the way it is, so they guess or avoid it.*

---

## 4. Target users

| Persona | Situation | Priority for MVP |
|---|---|---|
| **New hire or onboarding engineer** | Joins a team with an older codebase and unclear ownership | **Primary** |
| **Open-source contributor** | Wants to fix a bug in an unfamiliar library and needs to know if a behavior is intentional | **Primary** |
| **Inheriting maintainer** | Takes over a project after the original maintainers left | Secondary |
| **Refactorer / PR reviewer** | About to delete or rewrite old code | Secondary |
| **Hackathon judges** | Score problem, execution, demo, and trust in a few minutes | **Demo audience** (design the demo for them) |

**MVP design target:** a developer who has just opened a file they don't understand and wants to know, in under a minute, whether a strange line is intentional and where the answer came from.

Secondary personas are served by the same features but get no dedicated UX in the MVP.

---

## 5. User pain points

| ID | Pain point | Root cause | Addressed in MVP? |
|---|---|---|---|
| P1 | "I can't tell if this weird code is intentional." | Rationale isn't stored next to the code | **Yes** (Line Why) |
| P2 | "`git blame` gives a name and date, not a reason." | Blame reports only the last touching commit | **Yes** |
| P3 | "The real reasoning is in a PR or issue I can't find." | Commits, PRs, and issues are separate surfaces with weak links | **Yes** (evidence linking) |
| P4 | "Commit messages just say 'fix' or 'wip'." | Low-effort commit hygiene | **Partly.** ColdCase flags low or no evidence; it cannot invent missing reasons |
| P5 | "The last commit was a big refactor or reformat." | Blame stops at moves and formatting changes | **Partly.** Whitespace/move-aware blame helps but isn't guaranteed |
| P6 | "The people who knew are gone." | Turnover | **Partly.** Recovers *documented* reasoning only |
| P7 | "AI explanations sound confident but I can't check them." | No provenance | **Yes** (receipts, verification, confidence) |
| P8 | "I don't have time to read 200 commits." | Volume | **Yes** (file stories) |
| P9 | "I don't know which files carry the important decisions." | No overview | **Partly.** Hotspots by change activity |

---

## 6. Proposed solution

### 6.1 What ColdCase does

The user opens a **case** (a repository). ColdCase shows:

1. A **case overview**: a short summary of the repo's major eras and key decisions, plus the hotspot files worth reading.
2. A **case file** per hotspot file: a chronological story of how and why the file reached its current form.
3. **Click-a-line → why**: click any marked line to see the commit that introduced it, the linked PR or issue, a one-paragraph reason, and a confidence label.
4. **Receipts everywhere**: every finding links to its evidence, and the evidence text is viewable in-app with the supporting sentence highlighted.

### 6.2 How it works (four steps)

1. **Collect history.** Use local `git` for per-file history and blame; use the GitHub API only for PR and issue text.
2. **Build an evidence ledger.** Normalize commits, PRs, issues, and comments into items with stable IDs and links. This is the single source of truth for generation, display, and verification.
3. **Reason with evidence.** A fast LLM (Groq) writes each file's story as structured claims that must cite ledger IDs and quote the evidence. A long-context LLM (Gemini) writes the case summary from the *verified* claims only.
4. **Verify and grade.** Code checks that each quoted sentence really appears in the cited evidence, then computes the confidence tier. Unsupported claims are dropped. Where there's no evidence, the UI says so.

### 6.3 Trust principles (product rules, not marketing)

- **Evidence or silence.** No claim is shown without a receipt, except the explicit "No recorded reason found."
- **Confidence is computed by code**, never self-reported by the LLM.
- **Stated vs. inferred** is labeled on every claim.
- **Read-only.** ColdCase never writes to a repository.
- **Only claim what we ship.** Any pitch or landing-page statement must map to a working feature (see the traceability list in `Problem-statement-analysis.md`, Section 1.5).

### 6.4 Delivery model for the MVP

The analysis pipeline runs **offline as a script** and writes static JSON for each case. The web app reads that JSON, so the demo never depends on live GitHub or LLM APIs. A **live "paste a URL" mode for small repos** is a P1 stretch built on the same pipeline.

---

## 7. Product goals

### 7.1 Product goals

| ID | Goal | How we'll know |
|---|---|---|
| G1 | A user can find *why* a specific line exists faster than by reading git history by hand | Demo: click line → answer with receipts in one interaction |
| G2 | Users can verify every finding themselves | 100% of displayed claims have a working evidence link or an explicit "no recorded reason" |
| G3 | The product is honest about uncertainty | Confidence tiers and limits banners visible; no speculation shown |
| G4 | The product explains itself | A first-time viewer can restate what it does after the landing page and demo |

### 7.2 Hackathon goals

| ID | Goal |
|---|---|
| H1 | A flawless 3-minute demo that runs from cached data, plus a backup video |
| H2 | Measured accuracy numbers (small but honest) shown in the pitch |
| H3 | A landing page and UI that look intentional and are keyboard-accessible |

### 7.3 Non-goals

- Analyzing every file in a repo, or repos of any size.
- Replacing conversations with the original authors.
- Being an IDE plugin, a bot, or a chat assistant (not in this build).

---

## 8. User stories

| ID | Story | Priority |
|---|---|---|
| US-1 | As a developer, I want to click a strange line and see why it exists, so I know whether it's safe to change. | P0 |
| US-2 | As a developer, I want a chronological story of a file, so I understand how it evolved without reading every commit. | P0 |
| US-3 | As a skeptical developer, I want to open the exact commit/PR/issue behind any claim, so I can verify it myself. | P0 |
| US-4 | As a developer, I want to see how confident ColdCase is in each claim, so I know how much to trust it. | P0 |
| US-5 | As a developer, I want ColdCase to say "No recorded reason found" when evidence is missing, so I'm not misled. | P0 |
| US-6 | As a newcomer, I want a case overview with the key eras and hotspot files, so I know where to look first. | P0 |
| US-7 | As a first-time visitor, I want the landing page to explain what ColdCase is, how it works, and what it can't do, so I understand it before using it. | P0 |
| US-8 | As a visitor, I want to open example cases without any setup, so I can try the product immediately. | P0 |
| US-9 | As a judge, I want to see measured accuracy results, so I can trust the claims. | P0 |
| US-10 | As a keyboard or screen-reader user, I want to navigate stories and evidence without a mouse, so the product is usable for me. | P0 |
| US-11 | As a developer on the team, I want to run the pipeline on a new repo with one command, so we can generate cases reproducibly. | P0 |
| US-12 | As a developer, I want to paste a link to a small public repo and get a case, so I can try it on my own project. | P1 |
| US-13 | As a developer, I want a second, independent check on each claim, so fewer weak claims slip through. | P1 |
| US-14 | As a maintainer, I want to export a file's story as Markdown, so I can share it. | P2 |

---

## 9. Functional requirements

Each requirement is testable. "Case data" means the static JSON produced by the pipeline for one repository.

### 9.1 Ingestion and history (pipeline)

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-1 | Accept a public GitHub repo (`owner/repo`) as pipeline input | P0 | Valid repo runs; invalid, private, or missing repo exits with a clear message |
| FR-2 | Get per-file commit history for analyzed files, rename-aware, from local `git` | P0 | For a file with a known rename, history spans both names |
| FR-3 | Rank files as hotspots and select the top N (default 8–10), excluding lockfiles, vendored, generated, and minified files | P0 | Ranking and its reasons (e.g., commit count, recency) are stored and shown; excluded patterns never appear |
| FR-4 | Produce line-level blame ranges for each analyzed file at the analyzed commit | P0 | Every marked line maps to a commit SHA |
| FR-5 | Link commits to PRs (parse `#N` from commit text first; GitHub API fallback), fetch PR title/body, and link issues via closing keywords | P0 | On the fixture repo, ≥ 90% of planted PR/issue links are found |
| FR-6 | Build the evidence ledger: typed items with stable IDs, URL, timestamp, author, text | P0 | Same repo + same commit produces the same IDs |
| FR-7 | Stay within API limits: dedupe PR/issue fetches, cache responses, retry with backoff | P0 | A full run on a demo repo completes without a rate-limit failure using a server-side token |
| FR-8 | Fetch PR review comments | P1 | Comments appear as evidence items |

### 9.2 Analysis

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-9 | Pack evidence per file within a token budget: prioritize commits with PR/issue links, signal words (`fix`, `bug`, `revert`, `workaround`, `regression`, `security`, `perf`), large diffs, and the file's creation; mark truncation | P0 | Prompt stays under the budget; truncated history is flagged as "sampled" |
| FR-10 | Generate each file's story with Groq as JSON claims (`text`, `kind` stated/inferred, `evidenceIds`, `quote`, optional `lineRange`) | P0 | Output validates against the schema; invalid output is retried, then reported as a failure |
| FR-11 | "No evidence" is a valid output and speculation about motives is not allowed | P0 | Fixture files with only junk commits yield "No recorded reason found" rather than invented reasons |
| FR-12 | Generate the case summary with Gemini from verified claims only (eras, key decisions), each referencing claim IDs | P0 | Every summary statement traces to at least one verified claim |

### 9.3 Verification and confidence

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-13 | Deterministic quote check: every `stated` claim's quote must appear in its cited evidence (whitespace-normalized) | P0 | A planted false claim in a test is rejected |
| FR-14 | Compute confidence in code: **High** = stated + PR/issue evidence with substantive text + quote verified; **Medium** = stated from a descriptive commit message + quote verified; **Low** = inferred; **None** = no evidence | P0 | Table-driven unit tests cover each tier and edge case |
| FR-15 | Remove claims that fail verification and log them | P0 | Removed claims never render; log lists them |
| FR-16 | LLM entailment check ("does this evidence support this claim?") as a second verifier | P1 | Adds a `supported/partial/unsupported` result; `partial` becomes Low |

### 9.4 Presentation (web app)

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-17 | **Landing page** with: hero and value statement; interactive mini-demo using real fixture data; four-step "how it works"; sample claim card showing receipts, stated/inferred label, and confidence legend; honest limits; accuracy panel; example cases | P0 | All sections present; mini-demo works with no network calls; a new viewer can explain the product afterward |
| FR-18 | **Case library**: list of pre-computed cases with repo name, files analyzed, and confidence mix | P0 | Selecting a case opens its overview in under 2 seconds |
| FR-19 | **Case overview**: summary (eras, key decisions), hotspot list with reasons, limits banner | P0 | Each hotspot opens its case file |
| FR-20 | **Case file view**: code viewer with gutter markers on lines that have linked history; story panel with claims in chronological order and confidence badges | P0 | Story claims and code markers are in sync |
| FR-21 | **Line Why panel**: click a marked line to see the introducing commit, linked PR/issue, the claim, and its confidence | P0 | Works with mouse and keyboard; links open the correct source URL |
| FR-22 | **Evidence drawer**: full evidence text with the quoted span highlighted and an "Open on GitHub" link | P0 | Highlighted span matches the claim's quote |
| FR-23 | **Confidence display**: text label + icon + legend; never color alone | P0 | Passes a grayscale check |
| FR-24 | **Honesty banners**: "based on sampled history," "low evidence in this file," "case limited to top N files" | P0 | Banners appear on fixture files that trigger them |
| FR-25 | **Live analysis**: paste a URL of a small public repo, watch progress, get a case | P1 | Completes for a small repo or fails gracefully with an actionable message |
| FR-26 | **Markdown export** of a case file | P2 | Export contains claims with links |

### 9.5 Data, fixtures, and evaluation

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-27 | Case data is stored as static JSON and served without live API calls | P0 | Demo works with the network disabled (after page load) |
| FR-28 | **Fixture repo**: a small real GitHub repo (20–40 commits) with deliberately odd code, real PRs and issues explaining it, a few junk-message commits, and one undocumented change | P0 | Ground truth is written down; the landing mini-demo uses it |
| FR-29 | **Eval script** producing quote-check pass rate, removal rate, and coverage; plus a hand-labeled sample of ~20 claims for human-checked precision; writes `eval/RESULTS.md` | P0 | Numbers in the pitch come only from this file |

---

## 10. Non-functional requirements

| ID | Category | Requirement | Target | How verified |
|---|---|---|---|---|
| NFR-1 | Performance | Cached case pages load quickly | < 2 s on a normal connection | Manual timing on the deployed site |
| NFR-2 | Performance | Line click to Line Why panel | < 200 ms (data is local) | Manual check |
| NFR-3 | Reliability | Demo never depends on live GitHub/LLM calls | 0 live calls in demo path | Network-off test |
| NFR-4 | Pipeline runtime | One case (top-N files) completes within a practical window, run offline | Target under ~30 min per case; report actual | Timed run |
| NFR-5 | Trust / correctness | Every displayed claim has a receipt or is "No recorded reason found" | 100% | Automated check over all case JSON |
| NFR-6 | Trust / correctness | Every `stated` claim's quote appears in cited evidence | 100% of displayed claims | Automated check |
| NFR-7 | Accessibility | Meets WCAG 2.2 AA as a target: semantic landmarks and headings, skip link, full keyboard operation (including code viewer and Line Why), visible focus, adequate contrast on the dark theme, reduced-motion support, screen-reader-friendly labels | Automated audit (e.g., axe/Lighthouse) plus a manual keyboard run | Audit report + checklist |
| NFR-8 | Usability | Confidence never conveyed by color alone | Text + icon on all badges | Grayscale review |
| NFR-9 | Design quality | Intentional, restrained visual design: dark theme with one accent color, strong typographic hierarchy, minimal card clutter, purposeful motion only | Team review against a short design checklist | Review |
| NFR-10 | Security / privacy | Public repos only; read-only access; API keys server-side only; no tokens in logs or client bundles | No secrets in repo or client code | Secret scan + code review |
| NFR-11 | Compatibility | Works in current Chrome, Firefox, Safari; responsive down to phone width | Layout usable at ~375 px | Manual check |
| NFR-12 | Maintainability | TypeScript strict mode; Zod validation for LLM output and case data; unit tests for confidence, quote check, and junk-message rules | Tests pass in CI or locally | Test run |
| NFR-13 | Cost | Stay within free-tier LLM and API quotas | Check current limits in each console before the event | Call-count log |
| NFR-14 | Observability | Pipeline logs each step, LLM call count, and verifier outcomes | Log file per run | Inspect logs |

---

## 11. Core features

Each feature is chosen because a judge can **see it working** in the demo.

| ID | Feature | What the user sees | Why it's core | Maps to |
|---|---|---|---|---|
| CF-1 | **Explanatory landing page** | Clear value statement, an interactive mini-demo, how it works, trust example, limits, accuracy numbers, example cases | First impression; explains the product before any interaction | FR-17 |
| CF-2 | **Case library** | Pre-computed cases (fixture + real repos) ready to open | Zero-setup demo | FR-18, FR-27 |
| CF-3 | **Case overview** | Short summary of eras/decisions, plus ranked hotspot files | Orients the user; shows whole-repo synthesis | FR-12, FR-19 |
| CF-4 | **Case file (file story)** | Code with gutter markers beside a chronological story with claims | The main deliverable of the product | FR-10, FR-20 |
| CF-5 | **Click-a-line → why** | Click a line, get the commit, PR/issue, reason, and confidence | The "wow" moment and direct answer to the core pain | FR-21 |
| CF-6 | **Receipts and evidence drawer** | Every claim links to its source; drawer shows the highlighted sentence | The trust differentiator | FR-13, FR-22 |
| CF-7 | **Confidence tiers and honest "no evidence"** | Badges (text + icon) and "No recorded reason found" | Shows the product refuses to guess | FR-11, FR-14, FR-23, FR-24 |
| CF-8 | **Accuracy panel** | A small table of measured results with a failure example | Turns "trust us" into evidence | FR-29 |
| CF-9 *(P1)* | **Live analysis of small repos** | Paste a URL, watch progress, open the case | Lets judges try their own repo | FR-25 |

**Feature guardrail:** if a feature isn't in this list or the P1/P2 lists, it doesn't get built during the hackathon.

---

## 12. Nice-to-have features

None of these are needed for the demo. They are ordered by value to the core story.

| Feature | Why it's not in the MVP |
|---|---|
| **Entailment verifier** (FR-16) | Quote check already gives the key guarantee; adds cost and complexity |
| **Timeline chart** of eras | Case summary as a list is enough; charts take UI time |
| **Fence Check** ("is it safe to remove this?") | Strong idea but needs extra data (reverts, fixes) and new UX |
| **Grounded "Ask the history" chat** | High risk of ungrounded answers; needs its own evaluation |
| **Markdown export** (FR-26) | Nice, not demonstrable in a 3-minute pitch |
| **Function-level history** (`git log -L`) | More pipeline complexity for modest demo value |
| **Private repos via GitHub OAuth** | Auth, token handling, and security review |
| **GitHub Action / PR bot** | Different product surface and integration work |
| **VS Code extension / CLI** | Separate packaging and distribution |
| **Mining `Revert` commits for real "fence incidents"** | Great proof point for the pitch; only worth it if the pipeline is already stable |

---

## 13. User journeys

### Journey 1: Developer investigates a strange line (primary)

1. Priya (new hire) is about to refactor a module and notices an unexplained delay in the code.
2. She opens ColdCase, picks the relevant case from the library, and opens the case file.
3. Gutter markers show which lines have history. She clicks the delay line.
4. The Line Why panel shows: introducing commit, the linked PR, an excerpt from the linked issue, a one-paragraph reason, and a **High** confidence badge.
5. She opens the evidence drawer, sees the exact sentence highlighted in the issue, and clicks through to GitHub to confirm.
6. **Outcome:** she keeps the delay and adds a comment, avoiding a regression.

*Failure branch:* the clicked line has no linked PR/issue. The panel shows "No recorded reason found," the introducing commit, and a **None/Low** badge. She knows to ask a teammate instead of trusting a guess.

### Journey 2: Judge sees the demo (demo audience)

1. Judge lands on the landing page and reads the one-line value statement.
2. The mini-demo shows a strange line → click → receipts chain.
3. The presenter opens a pre-computed real case, then a file, then clicks a line and opens the evidence drawer.
4. The presenter shows a **low-evidence** file to prove ColdCase says "I don't know."
5. The accuracy panel shows measured numbers and one failure case.
6. **Outcome:** the judge can restate what it does and why it's trustworthy.

### Journey 3: Newcomer orients in an unfamiliar repo

1. A contributor opens a case overview.
2. She reads the eras summary, then the hotspot list with reasons ("changed often, recently").
3. She opens the top hotspot's case file and reads the story to understand the file's history before making a change.
4. **Outcome:** she knows which files carry the important decisions.

### Journey 4: Visitor tries their own repo (P1)

1. Visitor pastes a small public repo URL on the landing page.
2. A progress tracker shows cloning, linking PRs, ranking, writing, verifying.
3. On success, the case opens like any other. On failure (too large, private, rate-limited), a plain-language message explains why and suggests trying an example case.
4. **Outcome:** the visitor sees ColdCase work on something they know.

---

## 14. MVP scope

### 14.1 In scope (P0)

- Explanatory landing page with offline mini-demo, how-it-works, trust example, limits, and accuracy panel.
- Offline pipeline (script) producing case JSON: history, blame, PR/issue linking, evidence ledger, hotspot ranking.
- Groq per-file stories with schema validation.
- Deterministic quote check, code-computed confidence tiers, removal of unsupported claims.
- Gemini case summary from verified claims (a list of eras and decisions; no chart).
- Web app: case library, case overview, case file view with code viewer, Line Why panel, evidence drawer, confidence badges, honesty banners.
- **Cases: the fixture repo plus at least 2 real repos** (3 if time allows).
- Eval script and `eval/RESULTS.md` with honest numbers.
- Deployed frontend and a recorded backup demo video.

### 14.2 Stretch (P1), only after P0 is stable

- Live analysis for small repos (needs a small server that has `git` installed; a serverless-only setup usually can't do full clones).
- Entailment verifier.
- PR review-comment evidence.

### 14.3 Suggested build order (walking skeleton first)

Build a thin end-to-end slice early, then widen it. This is the safest path for a first-time team.

1. **Fixture repo** with real PRs and issues (budget about 2 hours; creating real PRs and issues by hand takes time).
2. **Pipeline v0:** run `git log`/`git blame` on the fixture and write JSON.
3. **UI v0:** render that JSON in the case file view with **hard-coded claims** (no LLM yet).
4. **Add the LLM:** Groq stories, schema validation, quote check, confidence.
5. **Add real repos** and PR/issue linking via the API.
6. **Add** Line Why, evidence drawer, case overview, and Gemini summary.
7. **Eval, accessibility pass, polish, deploy, rehearse.**

### 14.4 Indicative 24-hour plan (assumes 2–3 people)

| Hours | Focus |
|---|---|
| 0–1 | Lock scope, pick demo repos, scaffold app, set API keys |
| 1–4 | Fixture repo; pipeline v0; frontend shell and landing skeleton |
| 4–9 | **Walking skeleton:** fixture → JSON → case file view showing claims and receipts |
| 9–14 | Real repos, PR/issue linking, evidence packing, Groq stories, quote check, confidence |
| 14–18 | Line Why, evidence drawer, case overview, Gemini summary, pre-compute all cases |
| 18–21 | Eval script + hand-labeling, honesty banners, accessibility pass, landing mini-demo with fixture data |
| 21–23 | Deploy, rehearse three times, record backup video, finalize pitch |
| 23–24 | Buffer and submission |

**If solo or two beginners:** ship the fixture repo + 1 real repo, skip the Gemini summary (write a short summary by hand from verified claims and label it as such), and skip live mode.

### 14.5 Cut lines

- **Hour 9:** if the walking skeleton isn't working, stop all other work until it is.
- **Hour 14:** if the quote check and confidence function aren't done, finish them before anything visual. They are the trust story.
- **Hour 18:** if any P0 UI is unfinished, drop the case overview polish first, then the landing page mini-demo animation (keep it static).
- **Hour 21:** feature freeze.

### 14.6 Definition of done

- [ ] Landing page complete, explanatory, and keyboard-accessible.
- [ ] Fixture case + at least 2 real cases load from static JSON.
- [ ] Every displayed claim has a receipt or says "No recorded reason found" (automated check passes).
- [ ] Quote check and confidence tiers have passing unit tests.
- [ ] Honesty banners appear where expected.
- [ ] `eval/RESULTS.md` exists; pitch numbers come only from it.
- [ ] Deployed URL works; backup video recorded; three clean dry runs completed.

### 14.7 Three-minute demo script

1. **(0:00–0:30)** Show a strange line: "Would you delete this?" State the 58% comprehension statistic accurately.
2. **(0:30–1:00)** Landing page and the mini-demo; open a real case.
3. **(1:00–2:00)** Case file: click the line → commit, PR, issue quote, confidence badge → evidence drawer with the highlighted sentence.
4. **(2:00–2:30)** Open a low-evidence file: "It says so instead of guessing."
5. **(2:30–3:00)** Accuracy panel with real numbers and one failure; close with the tagline.

---

## 15. Out-of-scope features

These will **not** be built, even if time remains, unless the team explicitly re-scopes.

| Out of scope | Reason |
|---|---|
| Private repositories and user accounts / login | Adds auth and security work; not needed to prove the idea |
| Analyzing every file or very large repos | Cost, time, and rate limits; hotspots are enough to demonstrate value |
| Chat assistant / "Ask the history" | Hard to keep grounded; needs separate evaluation |
| IDE extension, CLI package, GitHub App, PR bot | Different distribution surfaces |
| "Fence Check" removal-safety advisor | Promising, but it's a second product feature needing new data and UX |
| Editing, committing, or commenting on repositories | Violates the read-only principle |
| Team features: sharing, comments, permissions | Not part of the core problem |
| Multi-language UI, localization | Not needed for the demo |
| Payments, pricing, analytics dashboards | Not relevant for a hackathon |
| Non-GitHub hosts (GitLab, Bitbucket) | Extra API integrations |
| Mobile-native apps | A responsive web app is sufficient |

---

## 16. Success metrics

Targets below are **goals set before measurement**. Report what we actually get; do not adjust the sample after seeing results.

### 16.1 Trust invariants (must be 100%)

| Metric | Target | How measured |
|---|---|---|
| Displayed claims with a receipt or an explicit "No recorded reason found" | 100% | Automated check over all case JSON |
| Displayed `stated` claims whose quote appears in the cited evidence | 100% | Automated check |
| Landing-page and pitch statements that map to a working feature | 100% | Team review against the traceability list |

### 16.2 Quality (report actuals)

| Metric | Target (aspirational) | How measured |
|---|---|---|
| Human-checked precision: claims that match their cited source | ≥ 80% on ~20 hand-labeled claims | Two people label independently; report agreement |
| Removal/downgrade rate | Report it (no target) | Eval script |
| Coverage: hotspot files with at least one High or Medium claim | Report it (no target) | Eval script; note that demo repos were chosen for rich history, which biases this upward |
| Fixture PR/issue links found | ≥ 90% | Compare against written ground truth |

### 16.3 Experience and demo

| Metric | Target | How measured |
|---|---|---|
| Cached case page load | < 2 s | Manual timing |
| Line click to answer | < 200 ms | Manual check |
| Demo runs cleanly | 3 consecutive dry runs with no errors | Rehearsal log |
| Accessibility | Lighthouse/axe accessibility score ≥ 90 on landing and case file pages (target) and a full keyboard-only walkthrough | Audit + manual run |
| Comprehension | At least 3 of 5 informal test viewers can restate what ColdCase does after the landing page | Quick hallway test with friends or teammates |

### 16.4 Hackathon outcome

- Demo completed within time, with backup video available.
- Judges' questions about accuracy answered with numbers from `eval/RESULTS.md`.

---

## 17. Risks and assumptions

### 17.1 Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Repos with junk commit messages or squash merges give thin evidence | High | High | Choose demo repos with rich PRs; use the fixture repo; show None/Low honestly |
| R2 | The LLM invents a "why" | Medium | **Fatal** | Evidence-only prompts, required quotes, deterministic quote check, remove failures |
| R3 | API rate limits or outages during the demo | High | High | Static JSON; server-side token; pre-computed cases; backup video |
| R4 | Building the fixture repo with real PRs/issues takes longer than expected | Medium | Medium | Start it in hour 1; keep it small (20–40 commits) |
| R5 | First-time team underestimates the pipeline | High | High | Walking skeleton by hour 9; cut lines in Section 14.5 |
| R6 | Prompt token overflow on large files | Medium | Medium | Evidence packing with priorities and truncation markers; flag "sampled history" |
| R7 | Pitch overclaims ("nobody does this," unbuilt features) | Medium | High | Use the wording rules; verify competitor claims before the pitch |
| R8 | Serverless hosting can't run full git clones | High for live mode | Medium | Pre-compute offline; live mode only via a separate small server (P1) |
| R9 | Free-tier LLM limits slow generation | Medium | Medium | Concurrency of 2–3, retry with backoff, run pipeline before the event where allowed |
| R10 | Accessibility and polish get squeezed at the end | High | Medium | Reserve hours 18–21; build with semantic components from the start |
| R11 | Scope creep (adding "impressive" features) | High | High | Feature guardrail in Section 11; out-of-scope list in Section 15 |
| R12 | Name conflict for "ColdCase" | Low | Low | Quick domain/GitHub/trademark check |

### 17.2 Assumptions (confirm or correct)

- Team of 2–3 people with basic React and JavaScript/TypeScript skills; the plan flags what to cut if smaller.
- Public GitHub repos only; English-language, text-based code.
- Free-tier access to Groq and Gemini; exact quotas change, so check each provider's console before the event.
- Hackathon allows pre-computed demo data and a recorded backup video.
- A server-side GitHub token (read-only) is available for the pipeline.
- Judges value working, verifiable output over breadth of features.

### 17.3 Open questions for the team

1. Hackathon name, deadline, and **judging criteria** (weights).
2. Final team size and roles (pipeline, frontend, eval/demo).
3. Any **required sponsor technologies** or APIs.
4. Demo format: live, recorded, or both; is a deployed URL required?
5. Which real repos become cases? (Pick by hour 1 after skimming their PR history.)
6. Language for the pipeline: TypeScript (recommended, one language across the stack) or Python?
7. Is live mode worth attempting, or should P1 time go to the entailment verifier instead?
