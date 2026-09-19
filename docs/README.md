# ColdCase

> git blame tells you who. ColdCase tells you why, with receipts.

ColdCase investigates why code looks the way it does by reading a repository's
commits, pull requests, and issues, and links every finding to the source that
proves it.

## Status

Hackathon build. Specifications complete. Code not yet started.

## Documentation

All specifications live in [`docs/`](./docs):

| Document | Purpose |
|---|---|
| `PRD.md` | Product requirements, features, MVP scope |
| `TRD.md` | Technical requirements and full spec |
| `CACHE_SCHEMA.md` | SQLite schema and JSON snapshot format |
| `API_SPECIFICATIONS.md` | Pipeline CLI, snapshot contract, worker API |
| `DATA_MODEL.md` | Tables, types, invariants |
| `EVIDENCE_MODEL.md` | How evidence is captured, linked, verified |
| `PROMPT_LIBRARY.md` | All LLM prompts |
| `ERROR_HANDLING.md` | Failure taxonomy and exit codes |
| `SECURITY.md` | Threat model and mitigations |
| `EVALUATION.md` | How accuracy is measured |
| `UI_SPEC.md` | Screens and components |
| `DESIGN.md` | Visual language and tokens |
| `AI_RULES.md` | Binding constraints for AI agents |
| `AI_MEMORY.md` | Session state and open threads |
| `System-Architecture.md` | High-level architecture (storage section superseded) |
| `Problem-statement-analysis.md` | Original problem analysis |

## Stack

React + Vite + Tailwind (web) · Node + TypeScript (pipeline) · SQLite + JSON (storage) · Groq + Gemini (LLMs)

## Getting started

```bash
npm install
npm run dev