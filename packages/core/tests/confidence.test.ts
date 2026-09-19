import { describe, it, expect } from 'vitest';
import { computeConfidence } from '../src/confidence.js';
import { Evidence } from '../src/schemas.js';

describe('computeConfidence', () => {
  it('returns NONE for claim with no evidence_ids', () => {
    expect(computeConfidence({ claim_id: 'c1', text: 'Some claim', evidence_ids: [] })).toBe('NONE');
  });

  it('returns NONE for "No recorded reason found"', () => {
    expect(
      computeConfidence({
        claim_id: 'c1',
        text: 'No recorded reason found',
        evidence_ids: ['commit:1234567890123456789012345678901234567890'],
      })
    ).toBe('NONE');
  });

  it('returns HIGH for stated claim with verified quote and substantive PR evidence', () => {
    const evidence: Evidence[] = [
      {
        id: 'pr:10',
        type: 'pull_request',
        url: 'https://github.com/foo/bar/pull/10',
        body: 'We refactored the database connection pool to prevent memory leaks under load.',
      },
    ];

    const result = computeConfidence(
      {
        claim_id: 'c1',
        text: 'Refactored connection pool for memory leak prevention.',
        evidence_ids: ['pr:10'],
        stated_vs_inferred: 'stated',
        quote: 'database connection pool to prevent memory leaks',
      },
      evidence
    );

    expect(result).toBe('HIGH');
  });

  it('returns LOW for stated claim with unverified quote', () => {
    const evidence: Evidence[] = [
      {
        id: 'pr:10',
        type: 'pull_request',
        url: 'https://github.com/foo/bar/pull/10',
        body: 'Some unrelated body text.',
      },
    ];

    const result = computeConfidence(
      {
        claim_id: 'c1',
        text: 'Claim with quote not in body',
        evidence_ids: ['pr:10'],
        stated_vs_inferred: 'stated',
        quote: 'nonexistent quote span',
      },
      evidence
    );

    expect(result).toBe('LOW');
  });

  it('returns LOW when all evidence consists of junk commit messages', () => {
    const evidence: Evidence[] = [
      {
        id: 'commit:1111111111111111111111111111111111111111',
        type: 'commit',
        url: 'https://github.com/foo/bar/commit/1111111111111111111111111111111111111111',
        body: 'fix',
      },
    ];

    const result = computeConfidence(
      {
        claim_id: 'c1',
        text: 'Fixed stuff',
        evidence_ids: ['commit:1111111111111111111111111111111111111111'],
        stated_vs_inferred: 'inferred',
      },
      evidence
    );

    expect(result).toBe('LOW');
  });
});
