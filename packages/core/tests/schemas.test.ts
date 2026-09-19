import { describe, it, expect } from 'vitest';
import { SnapshotSchema } from '../src/schemas.js';

describe('SnapshotSchema', () => {
  it('validates a correct snapshot object', () => {
    const validSnapshot = {
      schema_version: '1.0.0',
      generated_at: '2026-09-19T00:00:00Z',
      repo: {
        owner: 'testowner',
        name: 'testrepo',
        default_branch: 'main',
        last_fetched_sha: 'a3f9c2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9',
      },
      synthesis: {
        schema_version: '1.0.0',
        source_ref: 'testowner/testrepo@a3f9c2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9',
        eras: [],
        key_decisions: [],
      },
      stats: {
        files_analyzed: 1,
        files_total: 1,
        confidence_mix: { HIGH: 1, MEDIUM: 0, LOW: 0, NONE: 0 },
      },
      files: [
        {
          path: 'src/index.ts',
          hotspot_rank: 1,
          change_count: 5,
          sampled_history: false,
          content: 'console.log("hello");',
          blame: [
            {
              start: 1,
              end: 1,
              sha: 'a3f9c2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9',
              evidence_ids: ['commit:a3f9c2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9'],
            },
          ],
          narrative: {
            schema_version: '1.0.0',
            path: 'src/index.ts',
            source_ref: 'testowner/testrepo@a3f9c2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9',
            sampled_history: false,
            claims: [
              {
                claim_id: 'c1',
                text: 'Initial commit created main file.',
                evidence_ids: ['commit:a3f9c2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9'],
                confidence_tier: 'HIGH',
                stated_vs_inferred: 'inferred',
              },
            ],
          },
        },
      ],
      evidence: [
        {
          id: 'commit:a3f9c2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9',
          type: 'commit',
          url: 'https://github.com/testowner/testrepo/commit/a3f9c2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9',
          body: 'initial commit',
        },
      ],
    };

    const parsed = SnapshotSchema.safeParse(validSnapshot);
    expect(parsed.success).toBe(true);
  });
});
