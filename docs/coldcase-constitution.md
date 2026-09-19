# ColdCase Constitution

Binding workspace rules. Do not violate.

## Storage
- Live cache: SQLite at `.cache/coldcase.db`
- Demo artifacts: JSON at `data/demo/<owner>__<repo>.json`
- No server-based database. No Postgres. No Supabase. No Redis.

## Trust
- Every claim with confidence_tier != NONE has at least one evidence_id.
- Every stated claim has a verbatim quote from cited evidence.
- Confidence is computed by `packages/core/src/confidence.ts`, never by the LLM.
- The phrase "No recorded reason found" is exact. Do not paraphrase.

## Scope
- Only build features listed in `docs/PRD.md` §11 (Core Features) and §14.2 (Stretch).
- Anything else is out of scope.

## Code
- TypeScript strict mode.
- Zod validates every LLM output and every snapshot.
- No `dangerouslySetInnerHTML`. No shell strings. No secrets in the client.
- Every LLM call goes through `packages/pipeline/src/llm/index.ts`.
- Every catch block either handles and logs, or re-throws with context.

## Demo
- On demo day, `VITE_DATA_SOURCE=static`. Zero network calls after page load.
- Any feature that breaks with Wi-Fi off is a bug.