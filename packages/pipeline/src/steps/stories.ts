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

  const systemPrompt = `You explain why source code looks the way it does using ONLY the evidence items provided.

Rules:
1. Every claim must cite one or more evidence IDs from the EVIDENCE block. Never invent an ID.
2. A claim is \`stated\` only if the evidence text directly says it. A \`stated\` claim MUST include a VERBATIM QUOTE copied exactly from that evidence.
3. If you are reasoning from a diff or from context without a direct statement, mark the claim \`inferred\`.
4. Output valid JSON matching the provided schema. No prose outside the JSON.`;

  const userPrompt = `Repository: ${owner}/${repo}@${refSha}
File: ${packed.path}
Sampled history: ${packed.sampled_history}

<|EVIDENCE|>
${packed.packedText}
<|/EVIDENCE|>

Return JSON matching {"claims": [...]}`;

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
