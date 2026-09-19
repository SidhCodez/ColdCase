import { Narrative, Claim, quoteCheck } from '@coldcase/core';
import { EvidenceLedger } from './ledger.js';

/**
 * Verify step: validates claims from the LLM against the evidence ledger.
 *
 * Rules:
 * - Stated claims MUST have a verbatim quote found in the cited evidence.
 * - Inferred claims MUST cite at least one evidence ID that exists in the ledger.
 * - Evidence IDs are matched with fuzzy prefix matching (LLM may emit short SHAs).
 * - Claims that fail verification are dropped.
 * - If all claims are dropped, a single NONE claim is inserted.
 */
export function verifyStep(
  narrative: Narrative,
  ledger: EvidenceLedger
): Narrative {
  const verifiedClaims: Claim[] = [];

  // Build a lookup that resolves both full and prefix-matched evidence IDs.
  // The LLM sometimes emits "commit:abc1234" (7-char) instead of the full 40-char SHA.
  const resolveEvidenceId = (id: string): string | null => {
    // Exact match first
    if (ledger.items.has(id)) return id;

    // Prefix match for commit SHAs (commit:shortsha -> commit:fullsha)
    if (id.startsWith('commit:')) {
      const shortSha = id.substring(7);
      if (shortSha.length >= 7) {
        for (const key of ledger.items.keys()) {
          if (key.startsWith('commit:') && key.substring(7).startsWith(shortSha)) {
            return key;
          }
        }
      }
    }

    // PR and issue IDs should match exactly
    return null;
  };

  for (const claim of narrative.claims) {
    // Resolve all evidence IDs (handle short SHAs from LLM)
    const resolvedIds = claim.evidence_ids
      .map(resolveEvidenceId)
      .filter((id): id is string => id !== null);

    if (claim.stated_vs_inferred === 'stated') {
      // Stated claims MUST have a quote
      if (!claim.quote || !claim.quote.trim()) {
        continue; // Drop: no quote provided
      }

      if (resolvedIds.length === 0) {
        continue; // Drop: no valid evidence to check quote against
      }

      // Check quote against cited evidence bodies
      const citedItems = resolvedIds
        .map(id => ledger.items.get(id))
        .filter(Boolean);

      const isValid = citedItems.some(item => quoteCheck(claim.quote!, item!.body));

      if (isValid) {
        verifiedClaims.push({
          ...claim,
          evidence_ids: resolvedIds,
        });
      }
      // else: silently drop — quote not found in evidence
    } else {
      // Inferred claims — just need at least one valid evidence ID
      if (resolvedIds.length > 0) {
        verifiedClaims.push({
          ...claim,
          evidence_ids: resolvedIds,
        });
      }
      // else: silently drop — no valid evidence backing this inference
    }
  }

  // If all claims were dropped, insert the fixed "No recorded reason found" claim
  if (verifiedClaims.length === 0) {
    verifiedClaims.push({
      claim_id: `clm_none_${Date.now()}`,
      text: 'No recorded reason found',
      evidence_ids: [],
      confidence_tier: 'NONE',
      stated_vs_inferred: 'inferred',
    });
  }

  return {
    ...narrative,
    claims: verifiedClaims,
  };
}
