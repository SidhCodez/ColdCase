import { Narrative, Claim, quoteCheck } from '@coldcase/core';
import { EvidenceLedger } from './ledger.js';

export function verifyStep(
  narrative: Narrative,
  ledger: EvidenceLedger
): Narrative {
  const verifiedClaims: Claim[] = [];

  for (const claim of narrative.claims) {
    if (claim.stated_vs_inferred === 'stated') {
      // Must have a quote
      if (!claim.quote || !claim.quote.trim()) {
        continue; // Drop claim
      }

      // Check quote against cited evidence
      const citedItems = claim.evidence_ids
        .map(id => ledger.items.get(id))
        .filter(Boolean);

      const isValid = citedItems.some(item => quoteCheck(claim.quote!, item!.body));

      if (isValid) {
        verifiedClaims.push(claim);
      } else {
        // Drop unverified claim
      }
    } else {
      // Inferred claim — verify evidence IDs exist
      const validIds = claim.evidence_ids.filter(id => ledger.items.has(id));
      if (validIds.length > 0 || claim.text === 'No recorded reason found') {
        verifiedClaims.push({
          ...claim,
          evidence_ids: validIds,
        });
      }
    }
  }

  // If all claims were dropped, insert "No recorded reason found" claim
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
