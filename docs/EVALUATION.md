# ColdCase — Evaluation

ColdCase makes a specific promise: every claim is linked to a source, and the confidence tier is computed by code from evidence facts. A trust-first product that does not measure itself is just a claim about claims. This document defines what ColdCase measures, how it measures it, what counts as ground truth, how the numbers are reported, and what is explicitly not allowed. Every number that appears in the pitch, the landing page, or the README comes from the procedure in this document and from `eval/RESULTS.md`.

---

## 1. Purpose

The evaluation exists to answer four questions honestly:

1. **Does the pipeline keep its trust invariants?** These are binary and must be 100%.
2. **How often is a generated claim actually supported by its cited evidence?** This is the precision metric.
3. **How much does the pipeline throw away, and why?** This is the removal rate and the removal reason breakdown.
4. **How often does the pipeline have anything to say at all?** This is coverage.

Anything not answerable from the snapshot data or a small hand-labeled sample is out of scope. The evaluation is small by design. Honest small numbers beat large unverifiable ones.

---

## 2. Principles

Five rules govern the evaluation. They are not optional.

**Measure the product, not the demo.** The demo repos are chosen for rich history, which flatters every metric. The evaluation reports the bias and does not correct for it.

**Report what happened, not what was hoped for.** Targets are set before measurement. If the measurement misses the target, the target is reported as missed.

**Never tune the sample after seeing results.** The hand-labeled set is chosen before the labels are applied and before the pipeline numbers are read. Resampling after the fact invalidates the evaluation.

**Two independent labelers.** Every hand-labeled claim is judged by two people who do not discuss it first. Disagreement is reported, not resolved silently.

**Failures are first-class results.** Every report includes at least two failure examples. A report with zero failures is a report that was not read carefully.

---

## 3. Metrics

The evaluation produces eight numbers plus a failure list. Each number has a precise definition, a source, and a reporting rule.

### 3.1 Trust invariants (binary, must be 100%)

These are not metrics to optimize. They are pass/fail conditions. A single failure means the snapshot is invalid and must not be shipped.

| ID | Invariant | How measured |
|---|---|---|
| TI-1 | Every displayed claim has at least one receipt, or is the explicit `NONE` placeholder | Scan every snapshot; count claims with `confidence_tier != "NONE"` and empty `evidence_ids` |
| TI-2 | Every `stated` claim's quote appears verbatim in at least one cited evidence item, after whitespace normalization | Re-run `quoteCheck()` on every `stated` claim in every snapshot |
| TI-3 | Every evidence ID cited by any claim resolves to an item in the snapshot's `evidence[]` array | Build the set of evidence IDs; check every claim's `evidence_ids` is a subset |
| TI-4 | Every `files[].blame[].sha` appears in `evidence[]` as `commit:<sha>` | Build the set of commit evidence IDs; check every blame range's SHA is present |
| TI-5 | `stats.files_analyzed` equals `files.length` | Arithmetic check |
| TI-6 | `stats.confidence_mix` totals equal the sum of `claims[].confidence_tier` across all files | Arithmetic check |
| TI-7 | The same `(owner, repo, SHA)` produces the same evidence IDs on repeated runs | Run the pipeline twice on the fixture repo; diff the evidence ID sets |
| TI-8 | Landing-page and pitch statements map to working features | Team review against the traceability matrix in `Problem-statement-analysis.md` §1.5 |

TI-1 through TI-7 are checked by the eval script. TI-8 is a manual review and is signed off by the team before the pitch.

### 3.2 Precision

**Definition:** the fraction of kept claims whose text is supported by their cited evidence, as judged by a human who reads only the claim and the cited evidence.

**Why this metric:** the quote check verifies that a *quote* appears in the evidence. It does not verify that the *claim text* is a fair paraphrase of the quote. Precision measures the gap between "the quote exists" and "the claim is what the quote means."

**Sample:** twenty claims, drawn across all demo cases, stratified by confidence tier.

**Procedure:**

1. Two labelers independently read each of the twenty claims and the cited evidence.
2. Each labeler answers one question: "Does the cited evidence support this claim?"
3. Answer is `yes`, `partial`, or `no`.
4. A claim is **correct** if both labelers answer `yes`, or if one answers `yes` and the other answers `partial`.
5. A claim is **incorrect** if either labeler answers `no`.
6. Precision = correct / 20.
7. Inter-labeler agreement is reported as the fraction of claims where the two labelers gave the same answer.

**Reporting rule:** precision is reported with the raw fraction, the sample size, the agreement rate, and the breakdown of `yes` / `partial` / `no` votes.

### 3.3 Quote-check pass rate

**Definition:** the fraction of `stated` claims in the snapshot whose quote is found verbatim in at least one cited evidence item.

**Source:** the eval script re-runs `quoteCheck()` on every `stated` claim.

**Expected value:** 100%. Any claim below 100% is a bug in the pipeline, not a property of the data. If this number is below 100%, the pipeline's `verify` step is not doing its job and the pipeline must be fixed before the pitch.

**Reporting rule:** if this number is not 100%, the pitch does not claim it is 100%.

### 3.4 Removal rate

**Definition:** the fraction of claims generated by the model that were removed before persisting.

**Source:** the pipeline logs every removal with a reason code. The eval script counts removals and generated claims.

**Formula:** `removed / (removed + kept)`.

**Why it matters:** a high removal rate means the model is producing weak claims and the pipeline is correctly catching them. A low removal rate with low precision means the pipeline is not catching enough. The two numbers are read together.

**Reporting rule:** report the total and the breakdown by reason:

| Reason | Meaning |
|---|---|
| `quote_not_found` | A `stated` claim's quote is not in the cited evidence |
| `unknown_evidence_id` | A claim cites an ID that does not resolve |
| `claim_without_evidence` | A non-`NONE` claim has no evidence IDs |
| `entailment_unsupported` | The P1 verifier marked the claim `unsupported` |
| `schema_invalid` | The model's output did not validate |

### 3.5 Coverage

**Definition:** the fraction of analyzed files whose story contains at least one HIGH or MEDIUM claim.

**Source:** the eval script reads each snapshot and counts files.

**Formula:** `files_with_high_or_medium / files_analyzed`.

**Why it matters:** a file whose story is entirely LOW or NONE is a file where ColdCase has nothing useful to say. Coverage measures how often the product actually delivers.

**Bias note:** demo repos are chosen for rich PR and issue history. This biases coverage upward. The bias is stated in the report.

### 3.6 Confidence distribution

**Definition:** the fraction of kept claims in each tier: HIGH, MEDIUM, LOW, NONE.

**Source:** the eval script counts `claims[].confidence_tier` across all files.

**Why it matters:** a distribution with 90% LOW means the model is producing mostly inferred claims. A distribution with 90% HIGH on a repo with junk history is suspicious. The distribution is read alongside the repo's evidence quality.

**Reporting rule:** report the distribution per repo, not just in aggregate. Aggregate numbers hide per-repo differences.

### 3.7 PR/issue link discovery rate

**Definition:** on the fixture repo, the fraction of planted PR/issue links that the pipeline discovered.

**Source:** the fixture repo has a written ground truth file (`fixtures/fixture-repo/GROUND_TRUTH.md`) that lists every planted link. The eval script compares the ledger's edges to the ground truth.

**Target:** ≥ 90%.

**Why it matters:** if the linker misses links, the model cannot cite them, and claims that should be HIGH become MEDIUM or NONE. This metric isolates the linker from the rest of the pipeline.

### 3.8 Latency and cost

**Definition:** the median time per file and the total LLM call count per case.

**Source:** the pipeline logs step durations and LLM call counts. The eval script aggregates them.

**Why it matters:** free-tier quotas are finite. Knowing the cost per case lets the team plan how many cases to pre-compute before the demo.

**Reporting rule:** report the median, the maximum, and the count. Do not report a single "average" without a sense of the spread.

---

## 4. Datasets

The evaluation uses two datasets, each with a different purpose.

### 4.1 Fixture repo

**What it is:** a small, purpose-built GitHub repository with 20–40 commits that contains deliberately odd code, real PRs and issues that explain it, a few junk-message commits, and one undocumented change.

**Why it exists:** it is the only dataset with known ground truth. Every planted case has a written expected output.

**Used for:** link discovery rate (§3.7), removal rate (§3.4), and a sanity check on the other metrics.

**Ground truth location:** `fixtures/fixture-repo/GROUND_TRUTH.md`.

**Ground truth shape:** a table with one row per planted case:

| File | Planted behavior | Expected output |
|---|---|---|
| `src/delay.js` | A 200 ms delay with a PR explaining the race | HIGH claim citing the PR quote |
| `src/nullcheck.js` | A defensive null check with a linked issue | HIGH claim citing the issue quote |
| `src/duplicate.js` | A duplicated function with a descriptive commit | MEDIUM claim |
| `src/junk.js` | A file changed only by junk-message commits | NONE claim ("No recorded reason found") |
| `src/undocumented.js` | A change with no linked PR or issue, only a diff | LOW inferred claim |
| `src/false-claim.js` | A file where the model is likely to invent a reason | Claim removed by the quote check |

### 4.2 Real demo repos

**What they are:** two or three mid-size public repositories with rich PR and issue history, permissive licenses, and readable code. Selected in hour 1 by skimming their PR history.

**Why they exist:** the fixture repo is honest but small. The real repos prove the pipeline works on code the team did not write.

**Used for:** precision (§3.2), coverage (§3.5), confidence distribution (§3.6), latency and cost (§3.8).

**Bias acknowledgment:** these repos were chosen for their evidence quality. The evaluation states this in the report and does not pretend the numbers generalize to all repos.

---

## 5. Ground truth

Ground truth is what the pipeline's output is compared against. It comes from two sources.

### 5.1 Written ground truth

For the fixture repo, the expected output for each planted case is written in `GROUND_TRUTH.md` before the pipeline is run. The written ground truth is not edited after the pipeline runs.

### 5.2 Human judgment

For the real repos, ground truth for precision comes from a human reading the claim and the cited evidence. The judgment is about whether the evidence supports the claim, not about whether the claim is interesting or well-written.

### 5.3 What is not ground truth

- The model's own confidence score. It is a hint, not a label.
- The pipeline's confidence tier. It is a computed label, and the precision metric is the check on whether it is correct.
- The presence of a quote. A quote can appear in the evidence and still be used to support a claim the evidence does not actually make.

---

## 6. Sampling

The precision sample is twenty claims, drawn from the kept claims in all demo cases.

### 6.1 Stratification

The sample is stratified by confidence tier, roughly proportional to the distribution:

- If 60% of kept claims are HIGH, about 12 of the 20 are HIGH.
- If 25% are MEDIUM, about 5 are MEDIUM.
- If 15% are LOW, about 3 are LOW.
- NONE claims are excluded from the precision sample; they are the explicit placeholder and have no evidence to judge.

### 6.2 Selection

Selection is random within each stratum, with a fixed seed recorded in `eval/run.ts`. The seed is set before the pipeline is run, so the sample cannot be tuned.

### 6.3 Rules

- The sample is drawn once per evaluation run.
- The sample is not re-drawn after the labels are collected.
- If a claim is dropped by the pipeline between sampling and labeling (it should not be, but if it is), it is replaced by the next claim from the same stratum, and the replacement is noted.
- Claims that span multiple files are treated as one claim.

---

## 7. Hand-labeling protocol

Two people label the twenty sampled claims. They do not discuss the labels until both have finished.

### 7.1 What a labeler sees

For each claim, the labeler sees:

- The claim text
- The `stated` or `inferred` label
- The confidence tier
- The full text of every cited evidence item
- The claim's quote, if any

The labeler does not see the pipeline's verdict, the model's name, or the other labeler's answers.

### 7.2 What a labeler answers

One question: **"Does the cited evidence support this claim?"**

| Answer | Meaning |
|---|---|
| `yes` | The evidence directly states or clearly entails the claim |
| `partial` | The evidence is related but does not fully support the claim |
| `no` | The evidence does not support the claim, or contradicts it |

### 7.3 How agreement is computed

Agreement is the fraction of the twenty claims where both labelers gave the same answer. It is reported alongside precision.

If agreement is below 0.7, the labelers discuss the disagreements, agree on a rule for the ambiguous cases, and re-label. The re-label is noted in the report.

### 7.4 How the final label is decided

- `yes` + `yes` → correct
- `yes` + `partial` → correct
- `yes` + `no` → incorrect
- `partial` + `partial` → correct
- `partial` + `no` → incorrect
- `no` + `no` → incorrect

The rule is deliberately strict on `no`. A single `no` means the claim fails.

---

## 8. The eval harness

The eval harness is a single script: `eval/run.ts`. It reads snapshots and logs, computes the metrics, and writes `eval/RESULTS.md`.

### 8.1 Inputs

- All snapshots in `data/demo/`
- The pipeline run logs in `.cache/logs/`
- The fixture ground truth in `fixtures/fixture-repo/GROUND_TRUTH.md`
- The hand labels in `eval/labels.csv`

### 8.2 Outputs

- `eval/RESULTS.md` — the human-readable report
- `eval/RESULTS.json` — the same numbers, machine-readable
- Console summary printed to stdout

### 8.3 What it does not do

- It does not call any LLM.
- It does not call GitHub.
- It does not modify any snapshot.
- It does not re-run the pipeline.
- It does not pick the precision sample. That is done once, by hand, before the labels are collected.

### 8.4 Failure handling

If the harness finds a trust invariant failure (TI-1 through TI-7), it writes the failure to `RESULTS.md` and exits with a non-zero code. A run with a failed invariant is not a valid evaluation.

---

## 9. RESULTS.md format

`eval/RESULTS.md` is generated by the harness. It is the only source of numbers in the pitch. Its shape is fixed.

```
# ColdCase — Evaluation Results

Generated: <ISO 8601 timestamp>
Schema version: <SCHEMA_VERSION>
Prompt version: <PROMPT_VERSION>
Pipeline commit: <short sha>
Cases evaluated: <list of owner/repo>

## Trust invariants

| ID | Invariant | Result |
|---|---|---|
| TI-1 | Every displayed claim has a receipt | PASS / FAIL |
| TI-2 | Every stated quote is in its evidence | PASS / FAIL |
| ... | ... | ... |

## Per-case summary

| Case | Files analyzed | Claims kept | HIGH | MEDIUM | LOW | NONE | Removals |
|---|---|---|---|---|---|---|---|
| owner/repo | 10 | 42 | 18 | 12 | 8 | 4 | 6 |

## Aggregate metrics

| Metric | Value | Sample size | Notes |
|---|---|---|---|
| Quote-check pass rate | 100% | 240 claims | TI-2 |
| Removal rate | 12.5% | 48 removed of 288 generated | Breakdown below |
| Coverage | 80% | 8 of 10 files with ≥1 HIGH or MEDIUM | Per case, median |
| Precision | 85% | 20 hand-labeled claims | Agreement: 0.90 |
| PR/issue link discovery | 94% | Fixture repo, 17 of 18 planted links | |
| Median time per file | 22 s | 10 files, fixture repo | |
| LLM calls per case | 11 | 10 Groq + 1 Gemini | |

## Removal reasons

| Reason | Count | % of removals |
|---|---|---|
| quote_not_found | 30 | 62% |
| unknown_evidence_id | 10 | 21% |
| claim_without_evidence | 5 | 10% |
| schema_invalid | 3 | 7% |

## Confidence distribution

| Tier | Count | % of kept claims |
|---|---|---|
| HIGH | 60 | 50% |
| MEDIUM | 40 | 33% |
| LOW | 15 | 12% |
| NONE | 5 | 4% |

## Precision sample

<Table of 20 rows: claim_id, case, confidence tier, labeler A, labeler B, final>

## Failure cases

<At least two examples. Each example includes the claim text, the cited evidence, the model's
output, and the reason the claim failed or was removed.>

## Bias notes

- Demo repos were chosen for rich PR/issue history. Coverage is biased upward.
- The fixture repo was designed to exercise every confidence tier. Its distribution is not
  representative of real repos.
- Hand labels were collected by the two-person team that built the pipeline. This is not a
  blinded study.

## What this evaluation does not claim

<Explicit list. See section 10.>
```

---

## 10. What the evaluation does not claim

The evaluation is deliberately small. It does not support the following claims, and the pitch must not make them.

- **"ColdCase is accurate on all repositories."** The evaluation covers two or three repos chosen for their evidence quality.
- **"ColdCase is 85% accurate."** Precision is 85% on a twenty-claim sample from those repos. The confidence interval on twenty samples is wide.
- **"ColdCase replaces reading the history."** The evaluation does not measure whether a developer makes a better decision with ColdCase than without it.
- **"ColdCase is better than git blame."** No head-to-head comparison was run.
- **"ColdCase works on any language."** The evaluation covers the languages of the demo repos.
- **"ColdCase is fast."** Latency numbers are for pre-computed snapshots on the demo machine.
- **"ColdCase is production-ready."** It is a hackathon build with a 24-hour budget.

If a pitch statement requires one of these claims, the statement is removed. The traceability matrix in `Problem-statement-analysis.md` §1.5 is the check.

---

## 11. Reporting rules

These rules are absolute. Breaking any of them invalidates the evaluation.

- **Numbers come only from `eval/RESULTS.md`.** No number is written by hand into a slide, a README, or a landing page.
- **Targets are set before measurement.** A target set after the results are known is not a target; it is a rationalization.
- **The sample is not tuned.** The seed is fixed before the pipeline runs. The labels are not re-drawn.
- **Failures are reported.** Every report includes at least two failure examples. A report with zero failures is not credible.
- **Bias is stated.** The report names the ways the sample over-represents ColdCase's strengths.
- **Small numbers are honest numbers.** Twenty hand-labeled claims and a ninety-link ground truth are enough to show the pipeline works. They are not enough to claim generalization, and the report says so.

---

## 12. Anti-patterns

Things that would invalidate the evaluation if done.

- **Tuning the sample after seeing results.** The seed is fixed before the pipeline runs.
- **Editing the ground truth after the pipeline runs.** The fixture repo's ground truth is written first and read second.
- **Reporting a target as a result.** If the target was ≥ 80% and the result was 74%, the result is 74%.
- **Hiding failures.** Every failure is listed with its claim text and evidence.
- **Re-labelling until the numbers look better.** If the two labelers disagree, the disagreement is reported and the rule for resolving it is applied once.
- **Comparing against a strawman.** There is no baseline in this evaluation. Do not invent one.
- **Claiming generalization from the demo repos.** The bias note is not decoration.
- **Using the model's confidence score as ground truth.** It is a hint, not a label.
- **Reporting an average without a spread.** Every latency and cost number includes its range.
- **Running the eval on a snapshot that violates a trust invariant.** If TI-1 through TI-7 fail, the eval is not valid.
- **Fabricating a number.** Ever.

---

## 13. Schedule

The evaluation runs in three windows during the hackathon.

| Window | Hours | Activity |
|---|---|---|
| Early | 4–9 | Fixture repo ground truth written; pipeline runs on the fixture; first link discovery check |
| Mid | 14–18 | Pipeline runs on all demo repos; precision sample drawn; labels collected |
| Final | 19–21 | Eval harness runs; `RESULTS.md` written; pitch numbers copied from the file |

The final window is reserved. Do not start new features during it. The evaluation is the pitch's evidence; it is more valuable than one more feature.

---

## 14. Checklist

Before the pitch:

- [ ] Fixture repo ground truth is written and matches `GROUND_TRUTH.md`.
- [ ] Pipeline has run on the fixture repo and on every demo repo.
- [ ] Every snapshot passes TI-1 through TI-7.
- [ ] The precision sample was drawn with the fixed seed before the pipeline ran.
- [ ] Both labelers have finished their twenty labels independently.
- [ ] Agreement is computed and reported.
- [ ] `eval/RESULTS.md` exists and is generated by the harness, not edited by hand.
- [ ] Every number in the pitch is copied from `eval/RESULTS.md`.
- [ ] At least two failure cases are written into the report.
- [ ] Bias notes are present and specific.
- [ ] The "what this evaluation does not claim" list is in the report.
- [ ] TI-8 review is signed off by the team.

---

**End of Evaluation**