import { Narrative, Claim, computeConfidence } from '@coldcase/core';
import { EvidenceLedger } from './ledger.js';

export function confidenceStep(
  narrative: Narrative,
  ledger: EvidenceLedger
): Narrative {
  const evidenceArray = Array.from(ledger.items.values());

  const updatedClaims: Claim[] = narrative.claims.map(claim => {
    const computedTier = computeConfidence(claim, evidenceArray);
    return {
      ...claim,
      confidence_tier: computedTier,
    };
  });

  return {
    ...narrative,
    claims: updatedClaims,
  };
}
