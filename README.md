# ColdCase 🕵️‍♂️

> **git blame tells you who. ColdCase tells you why, with receipts.**

ColdCase is an autonomous forensic analysis pipeline that reads a repository's commits, pull requests, and issues to explain exactly *why* code looks the way it does. It bridges the gap between static code and historical intent, linking every single claim it makes to a verifiable source.

If a claim cannot be backed up by a verbatim quote from the project's history, ColdCase won't show it. **Evidence or silence.**

---

## 📖 Why Does This Exist?

When developers inherit a codebase, they spend hours reading `git blame`, searching through merged PRs, and digging through old issues just to answer one question: *"Is it safe to change this line, or is there a hidden reason it was written this way?"*

Standard AI coding assistants guess the answer by looking at the code structure. They hallucinate intent. ColdCase does the opposite: it performs an automated forensic audit of the actual historical record (PRs, issues, commits) and generates a verifiable case file.

**ColdCase is not a chat assistant or a code editor.** It is a specialized pipeline that generates static, offline-ready JSON snapshots of historical reasoning, viewable in a blazing-fast React web application.

---

## ✨ Core Features

* **Evidence-Driven UI (The Receipts):** Every explanation in the UI contains clickable receipts. Clicking a receipt opens the "Evidence Drawer" highlighting the exact verbatim quote from the original PR, commit, or issue.
* **Deterministic Confidence Engine:** Confidence is never self-reported by an AI. A pure, unit-tested TypeScript function computes confidence (HIGH, MEDIUM, LOW, NONE) based strictly on the presence of verified receipts. 
* **Zero Hallucination Guarantee (Trust Invariants):** Before a case is saved, the pipeline runs 8 strict mathematical invariants. It verifies that every stated claim contains a quote, and that the quote exists exactly in the cited GitHub data. Unbacked claims are automatically destroyed.
* **Repository Eras Synthesis:** Automatically breaks down years of repository history into logical "Eras" (e.g., *The TypeScript Migration*, *The Performance Rewrite*), identifying key architectural decisions.
* **Live Analysis & Offline Mode:** Users can paste any public GitHub URL into the UI to analyze it live. The resulting artifact is a portable JSON file that can be hosted on a static CDN (zero network calls required to view).

---

## 🧠 How It Works (The Pipeline)

ColdCase is split into a heavy backend Pipeline (Node.js) and a lightweight frontend Viewer (React). The pipeline executes a 14-step process:

1. **Ingest:** Clones the repository locally.
2. **Hotspots:** Ranks files by change frequency to find the most context-heavy files.
3. **History & Blame:** Runs `git log` and `git blame` to map every line to a commit SHA.
4. **Link (GitHub API):** Fetches the associated Pull Requests, Issues, and review comments for every commit.
5. **Ledger:** Builds an immutable evidence ledger of all historical text.
6. **Stories (Groq LLM):** Generates draft narratives for each file explaining its evolution.
7. **Verify:** A deterministic quote-checker drops any AI claims that hallucinated quotes.
8. **Confidence:** Assigns a strict confidence tier based on the remaining evidence.
9. **Summary (Gemini LLM):** Synthesizes the overall case and architectural decisions.
10. **Export & Invariants:** Validates the final artifact against 8 strict trust rules and saves a `.json` snapshot.

---

## 🤖 LLMs Used

ColdCase strategically routes tasks to different models based on their strengths:

* **Groq (Llama 3 70B):** Used for the per-file story generation. Groq's LPU inference engine provides the extreme speed necessary to analyze dozens of files in parallel without bottlenecks.
* **Google Gemini (1.5 Pro):** Used for the final repository synthesis. Gemini's massive context window allows it to ingest the entire evidence ledger at once to deduce sweeping architectural "Eras" and project-wide decisions.

---

## 📂 Project Architecture & Documents Created

This is a modern npm monorepo containing:

* `packages/core`: Pure, unit-tested TS functions governing schemas, quote-checking, and confidence calculation.
* `packages/pipeline`: The 14-step Node.js engine and CLI.
* `apps/worker`: An Express server that wraps the pipeline for live UI generation, complete with rate-limiting and background job tracking.
* `apps/web`: The React 18 + Vite + Tailwind frontend.
* `.cache/coldcase.db`: A local WebAssembly SQLite cache to ensure the pipeline doesn't over-query GitHub.

**Detailed Specifications Included:**
* `docs/AGENTS.md` - The binding constitution and constraints for the AI agents building this project.
* `docs/TRD.md` - Technical Requirements Document.
* `docs/CACHE_SCHEMA.md` - Full SQLite schema design.
* `docs/UI_SPEC.md` & `docs/DESIGN.md` - UI components and visual language.
* `eval/RESULTS.md` - Empirical evaluation results generated by the test harness.

---

## 🚀 How to Set This Up

### 1. Requirements
* Node.js v20+
* A GitHub Personal Access Token (Read-only)
* A Groq API Key
* A Google Gemini API Key

### 2. Installation
Clone the repository and install dependencies from the root:
```bash
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env` and add your keys:
```env
GITHUB_TOKEN=ghp_your_token_here
GROQ_API_KEY=gsk_your_key_here
GEMINI_API_KEY=AIzaSy_your_key_here
LIVE_MODE_ENABLED=true
ALLOWED_ORIGIN=*
```

### 4. Running the Application (Live Mode)
You need two terminals to run the live application.

**Terminal 1 (Backend Worker):**
```bash
npm run dev --workspace=apps/worker
```
*(Runs on port 3000)*

**Terminal 2 (Frontend UI):**
```bash
npm run dev --workspace=apps/web
```
*(Runs on port 3003 or 3004)*

Open the localhost URL provided by the frontend terminal, paste any public GitHub repository (e.g. `expressjs/express`), and ColdCase will automatically clone, analyze, and render the forensic history.
