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

  // Filter out NONE placeholder claims — they add no information
  const meaningfulClaims = allClaims.filter(c => c.text !== 'No recorded reason found');
  const claimsJson = JSON.stringify(
    meaningfulClaims.length > 0 ? meaningfulClaims : allClaims,
    null,
    2
  );

  const fileList = narratives.map(n => n.path).join(', ');

  const systemPrompt = `You are a software historian summarizing a repository's evolution.

Given a list of verified claims from the repository's hotspot files, you must:

1. Identify 2-5 distinct ERAS in the project's history. An era is a phase like "Initial Setup", "TypeScript Migration", "Performance Optimization", "API Redesign", etc. Each era should have:
   - A descriptive name (not generic — make it specific to this project)
   - A date range (start and end dates from the claim evidence)
   - A 2-3 sentence summary of what happened and WHY
   - claim_ids that belong to this era

2. Identify 2-6 KEY ARCHITECTURAL DECISIONS that shaped the codebase. Focus on choices like:
   - "Why was X library chosen over Y?"
   - "Why was the code restructured from A to B?"
   - "What bug or incident caused this design pattern?"

Output valid JSON matching: {"schema_version": "1.0.0", "source_ref": "...", "eras": [...], "key_decisions": [...]}`;

  const userPrompt = `Repository: ${owner}/${repo}@${refSha}
Analyzed files: ${fileList}

<|CLAIMS|>
${claimsJson}
<|/CLAIMS|>

Synthesize the repository's history into eras and key decisions. Be specific to this project — avoid generic placeholder text.`;

  const mockFallback: Synthesis = {
    schema_version: '1.0.0',
    source_ref: `${owner}/${repo}@${refSha}`,
    eras: [
      {
        name: 'Foundation and Initial Development',
        date_range: { start: '2020-01-01', end: '2024-12-31' },
        summary: `The ${repo} repository was established with its core functionality. Key files and project structure were created to support the primary use case.`,
        claim_ids: allClaims.map(c => c.claim_id).slice(0, 5),
      },
    ],
    key_decisions: [
      {
        text: `The project adopted its current file structure to support maintainability and clear separation of concerns.`,
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
