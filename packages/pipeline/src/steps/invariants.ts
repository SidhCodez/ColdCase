import { Snapshot, normalizeWhitespace } from '@coldcase/core';

export function invariantsStep(snapshot: Snapshot): void {
  const evidenceMap = new Map(snapshot.evidence.map(e => [e.id, e]));

  // Invariant 1: Every claim with confidence_tier != "NONE" has at least one entry in evidence_ids
  // Invariant 2: Every evidence ID cited resolves to snapshot.evidence[]
  // Invariant 3: Every claim with stated_vs_inferred == "stated" has non-empty quote
  // Invariant 4: Every quote on stated claim appears verbatim in at least one cited evidence item (after whitespace norm)
  for (const file of snapshot.files) {
    for (const claim of file.narrative.claims) {
      if (claim.confidence_tier !== 'NONE') {
        if (!claim.evidence_ids || claim.evidence_ids.length === 0) {
          throw new Error(
            `Invariant failure (1): Claim ${claim.claim_id} in ${file.path} has tier ${claim.confidence_tier} but no evidence_ids.`
          );
        }
      }

      for (const id of claim.evidence_ids) {
        if (!evidenceMap.has(id)) {
          throw new Error(
            `Invariant failure (2): Claim ${claim.claim_id} cites evidence ${id} which does not exist in snapshot.`
          );
        }
      }

      if (claim.stated_vs_inferred === 'stated') {
        if (!claim.quote || !claim.quote.trim()) {
          throw new Error(
            `Invariant failure (3): Stated claim ${claim.claim_id} in ${file.path} is missing quote.`
          );
        }

        const normQuote = normalizeWhitespace(claim.quote);
        const citedBodies = claim.evidence_ids
          .map(id => evidenceMap.get(id)?.body || '')
          .map(b => normalizeWhitespace(b));

        const match = citedBodies.some(body => body.includes(normQuote));
        if (!match) {
          throw new Error(
            `Invariant failure (4): Stated claim ${claim.claim_id} quote "${claim.quote}" does not match evidence.`
          );
        }
      }
    }

    // Invariant 5: Every files[].blame[].sha appears in evidence[] as commit:<sha>
    for (const range of file.blame) {
      const commitId = `commit:${range.sha}`;
      if (!evidenceMap.has(commitId)) {
        throw new Error(
          `Invariant failure (5): Blame SHA ${range.sha} in ${file.path} missing from evidence array.`
        );
      }
    }
  }

  // Invariant 6: stats.files_analyzed == files.length
  if (snapshot.stats.files_analyzed !== snapshot.files.length) {
    throw new Error(
      `Invariant failure (6): stats.files_analyzed (${snapshot.stats.files_analyzed}) != files.length (${snapshot.files.length}).`
    );
  }

  // Invariant 7: stats.confidence_mix totals equal sum of claims across all files
  let highSum = 0, medSum = 0, lowSum = 0, noneSum = 0;
  for (const file of snapshot.files) {
    for (const claim of file.narrative.claims) {
      if (claim.confidence_tier === 'HIGH') highSum++;
      if (claim.confidence_tier === 'MEDIUM') medSum++;
      if (claim.confidence_tier === 'LOW') lowSum++;
      if (claim.confidence_tier === 'NONE') noneSum++;
    }
  }

  const mix = snapshot.stats.confidence_mix;
  if (
    mix.HIGH !== highSum ||
    mix.MEDIUM !== medSum ||
    mix.LOW !== lowSum ||
    mix.NONE !== noneSum
  ) {
    throw new Error(
      `Invariant failure (7): stats.confidence_mix totals do not match claim counts across files.`
    );
  }
}
