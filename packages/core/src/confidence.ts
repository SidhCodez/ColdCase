import { Claim, Evidence, ConfidenceTier } from './schemas.js';
import { quoteCheck } from './quoteCheck.js';
import { isJunkCommitMessage, isSubstantiveText } from './junkMessages.js';

export function computeConfidence(
  claim: Partial<Claim>,
  evidenceItems: Evidence[] = []
): ConfidenceTier {
  // Rule 1: No evidence IDs or explicit "No recorded reason found" => NONE
  if (
    !claim.evidence_ids ||
    claim.evidence_ids.length === 0 ||
    claim.text === 'No recorded reason found'
  ) {
    return 'NONE';
  }

  // Find all cited evidence items
  const citedEvidence = evidenceItems.filter(e =>
    claim.evidence_ids?.includes(e.id)
  );

  // If none of the cited evidence items resolve => NONE
  if (citedEvidence.length === 0 && evidenceItems.length > 0) {
    return 'NONE';
  }

  const isStated = claim.stated_vs_inferred === 'stated';
  const hasQuote = Boolean(claim.quote && claim.quote.trim().length > 0);

  // If stated, quote must pass quoteCheck against at least one cited evidence body
  let quoteVerified = false;
  if (isStated && hasQuote && claim.quote) {
    quoteVerified = citedEvidence.some(e => quoteCheck(claim.quote!, e.body));
  }

  // If claim claims to be stated but quote is missing or fails verification => cap at LOW
  if (isStated && !quoteVerified) {
    return 'LOW';
  }

  const hasPRorIssue = citedEvidence.some(
    e => e.type === 'pull_request' || e.type === 'issue'
  );

  const hasSubstantiveBody = citedEvidence.some(e => isSubstantiveText(e.body));

  const isAllJunkCommits =
    citedEvidence.length > 0 &&
    citedEvidence.every(
      e => e.type === 'commit' && isJunkCommitMessage(e.body)
    );

  if (isAllJunkCommits) {
    return 'LOW';
  }

  // HIGH tier criteria:
  // Must have linked PR or Issue with substantive body AND (verified quote if stated, or clear evidence)
  if (hasPRorIssue && hasSubstantiveBody) {
    if (isStated && quoteVerified) {
      return 'HIGH';
    }
    if (!isStated) {
      return 'HIGH';
    }
  }

  // MEDIUM tier criteria:
  // Has evidence, non-junk, either PR/issue or decent commit
  if (citedEvidence.length > 0) {
    if (isStated && quoteVerified) {
      return 'MEDIUM';
    }
    if (!isStated) {
      return 'MEDIUM';
    }
  }

  return 'LOW';
}
