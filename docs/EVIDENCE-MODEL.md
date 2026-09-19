# ColdCase — Evidence Model

Evidence is the product. Every claim ColdCase shows is a thin layer of prose on top of an evidence item, and every trust guarantee the product makes reduces to one question: can the user open the exact source that proves this sentence? This document describes what evidence is, where it comes from, how it is normalized and linked, how it is packed for prompts, how it is verified, and how it is rendered. It is the deep reference for the evidence layer; the schema lives in `DATA_MODEL.md`, the prompts live in `PROMPT_LIBRARY.md`, and the API contracts live in `API_SPECIFICATIONS.md`.

---

## 1. What evidence is

An **evidence item** is a piece of recorded reasoning from a repository's history. It is a commit message, a pull request description, an issue report, a review comment, or an issue comment. It is text written by a human, stored by GitHub or git, and publicly readable.

Evidence is not:

- The code itself. Code shows *what* exists, not *why*.
- The diff. A diff shows *what changed*, not *why*.
- A summary. A summary is what ColdCase produces, and it must point back to evidence.
- A guess. If there is no evidence, ColdCase says so.

The unit of evidence is a single item with an ID, a type, a URL, a body, an author, and a timestamp. Everything else in the pipeline — the ledger, the packing, the verification, the display — operates on these items.

---

## 2. Evidence types

ColdCase recognizes five evidence types. Four are in the MVP; the fifth is P1.

| Type | Source | URL pattern | Typical strength |
|---|---|---|---|
| `commit` | Local `git log` | `github.com/{owner}/{repo}/commit/{sha}` | Medium (subject) to low (body) |
| `pull_request` | GitHub REST / GraphQL | `github.com/{owner}/{repo}/pull/{number}` | High (body + review discussion) |
| `issue` | GitHub REST / GraphQL | `github.com/{owner}/{repo}/issues/{number}` | High (bug reports, feature rationale) |
| `review_comment` | GitHub GraphQL | `github.com/{owner}/{repo}/pull/{number}#discussion_r{id}` | High (inline reasoning) — P1 |
| `issue_comment` | GitHub GraphQL | `github.com/{owner}/{repo}/issues/{number}#issuecomment-{id}` | Medium — P2, reserved |

### 2.1 Commit evidence

A commit is the smallest unit of history. Its subject line is often terse ("fix", "wip", "update"), but its body and its diff can be informative. Commits are always present; they are the backbone of blame and the fallback when no PR or issue exists.

What a commit evidence item carries:

- Full 40-character SHA
- Author (as recorded by git)
- Full message (subject + body)
- Committed timestamp
- Count of files changed
- Diff (not stored in the ledger, but used during packing)

### 2.2 Pull request evidence

A pull request is the richest evidence source. It carries a title, a description, a discussion thread, and a link to every commit it merged. PR bodies frequently state the reason for a change in plain language, which is exactly what ColdCase needs.

What a PR evidence item carries:

- Number
- Title
- Body (template boilerplate included; stripping happens at packing time)
- Author
- Merged timestamp (or null if not merged)
- Linked commit SHAs

### 2.3 Issue evidence

An issue is where a bug or feature request is described. It often states the symptom, the impact, and the expected fix. When a commit or PR closes an issue, the issue becomes strong evidence for a claim.

What an issue evidence item carries:

- Number
- Title
- Body
- State (`open` or `closed` at fetch time)
- Linked commit SHAs (via closing keywords)

### 2.4 Review comment evidence (P1)

An inline review comment is a comment on a specific line of a PR diff. It frequently contains the reasoning behind a change: "this needs a delay because the SDK hasn't flushed yet." These comments are not visible from `git blame`, which makes them high-value evidence when they can be fetched.

What a review comment carries:

- PR number
- GitHub's comment ID (used for deduplication)
- Author
- Body
- File path the comment is anchored to
- Line number
- Created timestamp

### 2.5 Issue comment evidence (P2, reserved)

A comment on an issue. Reserved for a future version; the schema and ID format are ready so no migration is needed when the feature lands.

---

## 3. Evidence lifecycle

Evidence moves through seven stages from a repository to the screen. Each stage has a single owner and a single output.

```
  fetch      normalize      link       ledger       pack       verify      display
   │            │            │            │            │           │           │
   ▼            ▼            ▼            ▼            ▼           ▼           ▼
 raw JSON    typed rows   edges       evidence    prompt      verdicts    drawer
 / git log                (ids)       items       inputs                  + receipts
```

### 3.1 Fetch

Two sources, in this order:

1. **Local git** for commits, per-file history, and blame. Cloned once per `(owner, repo, SHA)`. The clone is cached on disk.
2. **GitHub API** for PRs, issues, and review comments. REST for single lookups, GraphQL for batched fetches.

Every response is cached on disk under `.cache/github/`, keyed by a hash of the request URL and its parameters. A re-run after a crash never re-hits the API for data it already has.

### 3.2 Normalize

Raw git and GitHub data is converted into rows in the SQLite tables described in `DATA_MODEL.md`: `commits`, `prs`, `issues`, `review_comments`. Normalization does three things:

- Strips provider-specific fields that the pipeline does not need
- Coerces timestamps to ISO 8601 UTC
- Computes derived fields (`files_changed`, `linked_commits` arrays)

Normalization is deterministic. The same input produces the same rows.

### 3.3 Link

Link is where evidence becomes useful. It resolves four relationships:

| Relationship | Direction | Resolved by |
|---|---|---|
| Commit → PR | commit is part of a PR | Parse `#N` from commit text; fall back to `GET /commits/{sha}/pulls` |
| Commit → issue | commit closes or references an issue | Parse `fixes #N`, `closes #N`, `resolves #N` from commit and PR text |
| PR → issue | PR closes an issue | GraphQL closing-issue references on the PR |
| PR → review comment | PR has inline comments | GraphQL `pullRequest.reviewThreads` |

The output of link is a set of edges. Edges are not stored in their own table; they are resolved at ledger-build time and embedded into evidence IDs.

### 3.4 Ledger

The ledger is the normalized, stable, queryable set of evidence items for one case. It is built from the rows produced by normalize and the edges produced by link. It is the single source of truth for generation, display, and verification.

Building the ledger means:

1. Assigning each evidence item a stable ID (see §4).
2. Attaching evidence IDs to every blame range, derived from the range's commit SHA.
3. Marking junk commit messages using the heuristics in §6.
4. Serializing the result to the snapshot's `evidence[]` array.

The ledger is rebuilt on every pipeline run. It is deterministic: the same `(owner, repo, SHA)` produces the same ledger.

### 3.5 Pack

Packing selects which evidence items go into the per-file prompt, and in what order. The token budget is fixed; the packing algorithm prioritizes evidence by usefulness. The packing format is defined in `PROMPT_LIBRARY.md` §5. Packing never calls an LLM and never modifies the ledger; it produces a formatted text block.

### 3.6 Verify

Verification runs two checks on every claim the model produces:

1. **Quote check (deterministic, MVP):** every `stated` claim's `quote` must appear verbatim in at least one of its cited evidence items, after whitespace normalization.
2. **Entailment check (LLM, P1):** a second model call asks whether the evidence supports the claim.

A claim that fails the quote check is removed. A claim the entailment verifier marks `unsupported` is removed. A claim marked `partial` is downgraded to LOW.

### 3.7 Display

Display renders the evidence in three places:

- The **evidence drawer**, which shows the full body of one evidence item with the claim's quote highlighted.
- The **receipt links** on every claim card, which open the evidence item on GitHub.
- The **line-why panel**, which shows the introducing commit and its linked PR or issue.

The evidence drawer reads the snapshot's `evidence[]` array. It never makes a network call.

---

## 4. Evidence IDs

An evidence ID is a stable string that identifies one evidence item across the entire pipeline. It is the join key between the model's output, the evidence drawer, and the verification log.

### 4.1 Format

```
<type>:<identifier>[:<sub>]
```

| Type | Format | Example |
|---|---|---|
| Commit | `commit:<full_sha>` | `commit:a3f9c2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9` |
| Pull request | `pr:<number>` | `pr:1234` |
| Issue | `issue:<number>` | `issue:567` |
| Review comment | `comment:pr:<pr_number>:c:<gh_comment_id>` | `comment:pr:1234:c:89` |
| Issue comment (P2) | `comment:issue:<number>:c:<gh_comment_id>` | `comment:issue:567:c:41` |

### 4.2 Rules

- Commit IDs always use the full 40-character SHA. Short SHAs are ambiguous and forbidden.
- PRs and issues share the same GitHub number space but are separate tables, so the prefix disambiguates.
- The `c:` segment is literal and separates the parent object from the comment ID.
- IDs are case-sensitive.
- An ID must resolve to the same evidence item on every run. If a PR body is edited on GitHub, the pipeline re-fetches and overwrites the row; the ID stays the same.
- Evidence IDs are not stored in their own table. They are computed at ledger-build time.

### 4.3 Reverse mapping

Given a commit SHA, the pipeline resolves the full set of evidence IDs for that commit:

1. Always emit `commit:<sha>`.
2. Add `pr:<n>` for every PR whose `linked_commits` array contains the SHA.
3. Add `issue:<n>` for every issue whose `linked_commits` array contains the SHA.
4. Add `comment:pr:<n>:c:<id>` for every review comment on a PR from step 2 (P1).

This mapping is what makes "click a line → why" a plain lookup rather than a search. The blame range carries the SHA; the SHA expands to a set of evidence IDs; claims whose `evidence_ids` overlap that set are the answer.

---

## 5. Evidence linking rules

Linking is the process of resolving edges between evidence items. It runs once per pipeline run and is deterministic. The rules are applied in order; the first match wins.

### 5.1 Commit → PR

1. **Parse `#N` from the commit subject.** Squash merges commonly end subjects with `(#123)`. A regex captures the number.
2. **Parse `Merge pull request #N`.** Merge commits use this pattern.
3. **Fall back to the API.** `GET /repos/{owner}/{repo}/commits/{sha}/pulls` lists every PR that contains the commit. This is batched via GraphQL to stay within the hourly quota.

### 5.2 Commit → issue

1. **Parse closing keywords from the commit body.** `fixes #N`, `closes #N`, `resolves #N`, and their past-tense variants.
2. **Parse closing keywords from the linked PR body.** If the commit is part of a PR, the PR's closing keywords apply to the commit.
3. **Resolve via GraphQL.** For PRs, `closingIssuesReferences` returns the issues a PR closes without parsing text.

### 5.3 PR → review comment (P1)

Review comments are fetched per PR via GraphQL. Each comment is attached to its PR by number and to the file it was anchored to. There is no fuzzy matching; the GitHub API returns the relationships directly.

### 5.4 What linking is not

- Linking is not a semantic search. ColdCase does not look for "similar" issues. It resolves explicit references only.
- Linking is not a guess. If a commit has no `#N` in its text and no associated PR via the API, it has no PR edge. The claim that depends on it will be LOW or NONE.
- Linking is not recursive. A PR linked to an issue does not implicitly link that issue to every commit in the PR unless the PR's closing keywords say so. This is deliberate: transitive links produce weak evidence.

---

## 6. Evidence quality

Not all evidence is equally useful. Two heuristics classify the quality of a piece of text.

### 6.1 Junk commit messages

A junk commit message is one that carries no reasoning. These are common in mature repositories and are a core risk for ColdCase.

The heuristic in `packages/core/src/junkMessages.ts` flags a commit as junk when:

- The subject is shorter than 15 characters.
- The subject matches a known pattern: `fix`, `wip`, `update`, `misc`, `changes`, `cleanup`, `refactor`, `typo`, `style`, `Merge branch …`, `Update <file>`.
- The subject is only punctuation.

A junk commit can never support a HIGH or MEDIUM claim. If an entire file's history is junk, the story is the explicit `NONE` placeholder.

### 6.2 Substantive text

A PR or issue body is substantive when it contains more than boilerplate. The heuristic in `packages/core/src/junkMessages.ts`:

- Rejects bodies that are only HTML comments (template placeholders).
- Rejects bodies that start with template phrases like "Please describe".
- Rejects bodies shorter than 50 characters after whitespace normalization.

Substantive text is a precondition for the HIGH confidence tier. A PR with an empty body can still support a claim, but the claim will land in MEDIUM at best.

### 6.3 Signal words

Certain words in a commit or PR message suggest the change was deliberate and reasoned. The packing algorithm gives these commits extra weight.

The signal word list: `fix`, `bug`, `revert`, `hotfix`, `workaround`, `regression`, `security`, `perf`, `breaking`, `compat`.

Signal words do not raise confidence on their own. They influence which commits are packed into the prompt and therefore which evidence the model sees.

---

## 7. Evidence packing

Packing is how the ledger becomes a prompt input. It is deterministic, budget-bounded, and honest about truncation.

### 7.1 Priority scoring

Commits are scored before packing. Higher score wins; ties are broken by recency.

| Signal | Score |
|---|---|
| Commit has a linked PR or issue | +10 |
| Message contains a signal word | +5 |
| Diff is larger than 50 lines | +3 |
| Commit is the first commit that created the file | +8 |

### 7.2 Truncation

If the prioritized list does not fit in the token budget:

1. Drop the lowest-scoring commits first.
2. Keep PR and issue evidence for every kept commit.
3. Emit an explicit truncation note: `[truncated: N more commits]`.
4. Set `sampled_history: true` on the file.

The model sees the truncation note and knows the history is sampled. The UI shows an honesty banner.

### 7.3 What packing never does

- Packing never calls an LLM.
- Packing never modifies the ledger.
- Packing never sends the raw git log. It always sends a prioritized, formatted subset.
- Packing never drops the PR or issue evidence for a kept commit. The commit and its linked discussion travel together.

---

## 8. Evidence verification

Verification is what makes ColdCase trustworthy. It runs after the model returns and before anything is written to the snapshot.

### 8.1 Quote check (deterministic)

The quote check is a substring test after whitespace normalization. Both the quote and the evidence body go through the same `normalizeWhitespace()` function, which collapses every whitespace run to a single space and trims.

Rules:

- Every `stated` claim must have a non-empty `quote`.
- The quote must appear in at least one of the claim's cited evidence items.
- A claim that fails is removed, not downgraded.
- Removed claims are logged with their ID, reason, and cited evidence.

The quote check is the primary verification. It cannot be fooled by a confident-sounding model.

### 8.2 Entailment check (P1)

The entailment verifier is a second model call. It asks whether the evidence supports the claim, with three possible verdicts:

| Verdict | Effect |
|---|---|
| `supported` | Claim kept; confidence may stay HIGH or MEDIUM |
| `partial` | Claim kept; confidence downgraded to LOW |
| `unsupported` | Claim removed |

The entailment verifier never overrides the quote check. A claim whose quote fails is removed regardless of what the entailment verifier says.

### 8.3 What verification is not

- It is not a spell check. Grammar and typos in the claim text are irrelevant.
- It is not a style check. It does not care whether the claim is well written.
- It is not a fact check of the world. It only checks whether the cited evidence supports the claim.
- It is not a search for the correct evidence. If the model cited the wrong evidence, the claim is removed; the pipeline does not go looking for a better evidence item.

---

## 9. Evidence display

The web app renders evidence in three places. Each reads from the snapshot, never from the network.

### 9.1 Claim cards

Every claim in the story panel shows:

- The claim text
- A `stated` or `inferred` label
- A confidence badge with text, icon, and tooltip
- A list of receipt links, one per evidence ID

Clicking a receipt link opens the evidence drawer for that item.

### 9.2 Evidence drawer

The drawer shows one evidence item in full:

- Type and title
- Author and timestamp
- Full body as plain text (whitespace preserved)
- The claim's `quote` highlighted within the body
- An "Open on GitHub" link

The highlight is computed by the same normalization function used by the quote check, so the highlighted span is guaranteed to match what the pipeline verified.

### 9.3 Line-why panel

Clicking a gutter marker opens the Line Why panel for that line. The panel shows:

- The introducing commit (SHA, author, date, message)
- The linked PR or issue, if any
- The claim whose evidence overlaps the line's evidence IDs
- The confidence badge
- Receipt links

If no claim overlaps, the panel shows the commit and the explicit "No recorded reason found" message.

---

## 10. Evidence invariants

The pipeline's `invariants.ts` step checks these on every run. If any fails, the pipeline exits with a non-zero code and writes nothing to `data/demo/`.

1. Every evidence item in the snapshot has a non-empty `id`, `type`, `url`, and `body`.
2. Every evidence ID cited by any claim resolves to an item in the snapshot's `evidence[]` array.
3. Every claim with `confidence_tier != "NONE"` has at least one entry in `evidence_ids`.
4. Every claim with `stated_vs_inferred == "stated"` has a non-empty `quote`.
5. Every `quote` on a `stated` claim appears verbatim in at least one of its cited evidence items, after whitespace normalization.
6. Every `files[].blame[].sha` appears in `evidence[]` as `commit:<sha>`.
7. The same `(owner, repo, SHA)` produces the same evidence IDs on repeated runs.

A snapshot that violates any of these is rejected by the web app rather than rendered.

---

## 11. Evidence anti-patterns

Things that would weaken the product if done. Each one is forbidden by `AI_RULES.md`.

- **Inventing evidence.** Never synthesize a commit, PR, or issue that does not exist.
- **Citing without quoting.** A `stated` claim without a verbatim quote is not allowed.
- **Quoting without citing.** A quote with no evidence ID is not allowed.
- **Fuzzy quote matching.** No embeddings, no similarity search, no "close enough".
- **Transitive evidence.** A commit linked to a PR linked to an issue does not give the commit the issue's evidence unless the PR's closing keywords say so.
- **Showing a claim without a receipt.** The only exception is the explicit `NONE` placeholder.
- **Rendering third-party text as HTML.** All evidence text is plain text. No `dangerouslySetInnerHTML`.
- **Storing prompt transcripts.** Evidence is stored once; the assembled prompt is discarded.
- **Fetching evidence at display time.** The drawer reads from the snapshot. No network calls on the demo path.
- **Summarizing evidence instead of quoting it.** When a claim is `stated`, the user sees the exact sentence that supports it.

---

## 12. Evidence in the demo

The three-minute demo turns on evidence. The path is:

1. Open a case file.
2. Click a gutter marker on a strange line.
3. The Line Why panel shows the introducing commit and its linked PR.
4. The claim card shows a `stated` label and a HIGH confidence badge.
5. Open the evidence drawer.
6. The exact sentence from the PR is highlighted.
7. Click "Open on GitHub" to confirm the source.

That seven-step path is the product. Every rule in this document exists to make it work with no surprises, no network calls, and no invented reasoning.

The closing beat of the demo is the negative case: open a file whose only history is junk commits. The story says "No recorded reason found." The confidence badge says NONE. That single screen is what separates ColdCase from a fluent LLM wrapper.

---

**End of Evidence Model**