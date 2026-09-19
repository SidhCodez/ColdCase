import { z } from 'zod';
import { Synthesis, Narrative, SynthesisSchema } from '@coldcase/core';
import { LLMClient } from '../llm/index.js';

export async function summaryStep(
  narratives: Narrative[],
  owner: string,
  repo: string,
  refSha: string,
  llmClient?: LLMClient
): Promise<Synthesis> {
  const client = llmClient || new LLMClient();

  const allClaims = narratives.flatMap(n => n.claims);
  const claimsJson = JSON.stringify(allClaims, null, 2);

  const systemPrompt = `You are summarizing a repository's history from a set of verified claims.
Input: a list of claims.
Output: JSON object with "eras" and "key_decisions".`;

  const userPrompt = `Repository: ${owner}/${repo}@${refSha}
Claims:
<|CLAIMS|>
${claimsJson}
<|/CLAIMS|>`;

  const mockFallback: Synthesis = {
    schema_version: '1.0.0',
    source_ref: `${owner}/${repo}@${refSha}`,
    eras: [
      {
        name: 'Initial Skeleton Era',
        date_range: { start: '2026-09-01', end: '2026-09-19' },
        summary: 'Foundation setup and core architecture design.',
        claim_ids: allClaims.map(c => c.claim_id).slice(0, 5),
      },
    ],
    key_decisions: [
      {
        text: 'Adopted offline-first architecture with SQLite cache and JSON snapshots.',
        claim_ids: allClaims.map(c => c.claim_id).slice(0, 3),
      },
    ],
  };

  const result = await client.callJSON({
    provider: 'gemini',
    systemPrompt,
    userPrompt,
    schema: SynthesisSchema,
    cacheKey: `synthesis:${owner}:${repo}:${refSha}`,
    mockFallback,
  });

  return result;
}
