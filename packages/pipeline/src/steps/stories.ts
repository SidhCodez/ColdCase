import { z } from 'zod';
import { Claim, Narrative, ClaimSchema } from '@coldcase/core';
import { LLMClient } from '../llm/index.js';
import { PackedEvidence } from './pack.js';

const StoryOutputSchema = z.object({
  claims: z.array(ClaimSchema),
});

export async function storiesStep(
  packed: PackedEvidence,
  owner: string,
  repo: string,
  refSha: string,
  llmClient?: LLMClient
): Promise<Narrative> {
  const client = llmClient || new LLMClient();

  const systemPrompt = `You are a code historian. You explain why a source file looks the way it does by reading its commit history, pull requests, and issues.

RULES:
1. Generate 3-8 claims per file. Each claim explains one reason WHY the code was written or changed.
2. Every claim MUST cite one or more evidence IDs from the EVIDENCE block below (e.g. "commit:abc123...", "pr:42", "issue:7"). Never invent an evidence ID.
3. A claim is "stated" ONLY if the evidence text DIRECTLY says why a change was made. A stated claim MUST include a "quote" field containing the EXACT VERBATIM text copied from that evidence (PR body, commit message, or issue body). Copy it character-for-character.
4. A claim is "inferred" if you are deducing the reason from a diff, file name, or context — not from an explicit statement. Inferred claims do NOT need a quote.
5. Write claims in plain English that a junior developer can understand. Avoid jargon.
6. Focus on the INTERESTING decisions: why was this approach chosen over alternatives? What bug was fixed? What feature was added? Why was something refactored?
7. Use the FULL commit SHA (40 characters) from the evidence block when citing commits.
8. Output valid JSON matching: {"claims": [...]}`;

  const userPrompt = `Repository: ${owner}/${repo}@${refSha}
File: ${packed.path}
Sampled history: ${packed.sampled_history}

<|EVIDENCE|>
${packed.packedText}
<|/EVIDENCE|>

Analyze this file's history and return 3-8 claims explaining WHY it looks the way it does. Return JSON matching {"claims": [...]}`;

  // Mock fallback if offline/no LLM key provided
  const mockFallback: z.infer<typeof StoryOutputSchema> = {
    claims: [
      {
        claim_id: `clm_${packed.path.replace(/[^a-zA-Z0-9]/g, '_')}_1`,
        text: `File ${packed.path} was added to establish core repository functionality.`,
        evidence_ids: [`commit:${refSha}`],
        confidence_tier: 'HIGH',
        stated_vs_inferred: 'inferred',
      },
    ],
  };

  const result = await client.callJSON({
    provider: 'groq',
    systemPrompt,
    userPrompt,
    schema: StoryOutputSchema,
    cacheKey: `story:${owner}:${repo}:${packed.path}:${refSha}`,
    mockFallback,
  });

  return {
    schema_version: '1.0.0',
    path: packed.path,
    source_ref: `${owner}/${repo}@${refSha}`,
    sampled_history: packed.sampled_history,
    claims: result.claims,
  };
}
