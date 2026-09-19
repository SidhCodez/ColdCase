import { z } from 'zod';

export const EvidenceTypeSchema = z.enum([
  'commit',
  'pull_request',
  'issue',
  'review_comment',
  'issue_comment',
]);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

export const EvidenceSchema = z.object({
  id: z.string().min(1),
  type: EvidenceTypeSchema,
  url: z.string().url(),
  title: z.string().optional(),
  body: z.string(),
  author: z.string().optional(),
  created_at: z.string().optional(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const ConfidenceTierSchema = z.enum(['HIGH', 'MEDIUM', 'LOW', 'NONE']);
export type ConfidenceTier = z.infer<typeof ConfidenceTierSchema>;

export const StatedOrInferredSchema = z.enum(['stated', 'inferred']);
export type StatedOrInferred = z.infer<typeof StatedOrInferredSchema>;

export const LineRangeSchema = z.object({
  start: z.number().int().positive(),
  end: z.number().int().positive(),
});
export type LineRange = z.infer<typeof LineRangeSchema>;

export const ClaimSchema = z.object({
  claim_id: z.string().min(1),
  text: z.string().min(1),
  evidence_ids: z.array(z.string()),
  confidence_tier: ConfidenceTierSchema,
  stated_vs_inferred: StatedOrInferredSchema,
  quote: z.string().optional(),
  line_range: LineRangeSchema.optional(),
});
export type Claim = z.infer<typeof ClaimSchema>;

export const NarrativeSchema = z.object({
  schema_version: z.string(),
  path: z.string(),
  source_ref: z.string(),
  sampled_history: z.boolean(),
  claims: z.array(ClaimSchema),
});
export type Narrative = z.infer<typeof NarrativeSchema>;

export const BlameRangeSchema = z.object({
  start: z.number().int().positive(),
  end: z.number().int().positive(),
  sha: z.string().min(40).max(40),
  evidence_ids: z.array(z.string()),
});
export type BlameRange = z.infer<typeof BlameRangeSchema>;

export const DateRangeSchema = z.object({
  start: z.string(),
  end: z.string(),
});
export type DateRange = z.infer<typeof DateRangeSchema>;

export const EraSchema = z.object({
  name: z.string().min(1),
  date_range: DateRangeSchema,
  summary: z.string().min(1),
  claim_ids: z.array(z.string()).min(1),
});
export type Era = z.infer<typeof EraSchema>;

export const KeyDecisionSchema = z.object({
  text: z.string().min(1),
  claim_ids: z.array(z.string()).min(1),
});
export type KeyDecision = z.infer<typeof KeyDecisionSchema>;

export const SynthesisSchema = z.object({
  schema_version: z.string(),
  source_ref: z.string(),
  eras: z.array(EraSchema),
  key_decisions: z.array(KeyDecisionSchema),
});
export type Synthesis = z.infer<typeof SynthesisSchema>;

export const SnapshotRepoSchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  default_branch: z.string().min(1),
  last_fetched_sha: z.string().min(40).max(40),
});
export type SnapshotRepo = z.infer<typeof SnapshotRepoSchema>;

export const SnapshotStatsSchema = z.object({
  files_analyzed: z.number().int().nonnegative(),
  files_total: z.number().int().nonnegative(),
  confidence_mix: z.record(ConfidenceTierSchema, z.number().int().nonnegative()),
});
export type SnapshotStats = z.infer<typeof SnapshotStatsSchema>;

export const SnapshotFileSchema = z.object({
  path: z.string().min(1),
  hotspot_rank: z.number().int().positive(),
  change_count: z.number().int().nonnegative(),
  sampled_history: z.boolean(),
  content: z.string(),
  blame: z.array(BlameRangeSchema),
  narrative: NarrativeSchema,
});
export type SnapshotFile = z.infer<typeof SnapshotFileSchema>;

export const SnapshotSchema = z.object({
  schema_version: z.string(),
  generated_at: z.string(),
  repo: SnapshotRepoSchema,
  synthesis: SynthesisSchema,
  stats: SnapshotStatsSchema,
  files: z.array(SnapshotFileSchema),
  evidence: z.array(EvidenceSchema),
});
export type Snapshot = z.infer<typeof SnapshotSchema>;

export interface RenameEvent {
  old_path: string;
  new_path: string;
  commit_sha: string;
  renamed_at: string;
}
