export type ConfidenceTier = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
export type StatedOrInferred = 'stated' | 'inferred';

export interface Evidence {
  id: string;
  type: 'commit' | 'pull_request' | 'issue' | 'review_comment' | 'issue_comment';
  url: string;
  title?: string;
  body: string;
  author?: string;
  created_at?: string;
}

export interface Claim {
  claim_id: string;
  text: string;
  evidence_ids: string[];
  confidence_tier: ConfidenceTier;
  stated_vs_inferred: StatedOrInferred;
  quote?: string;
  line_range?: { start: number; end: number };
}

export interface Narrative {
  schema_version: string;
  path: string;
  source_ref: string;
  sampled_history: boolean;
  claims: Claim[];
}

export interface BlameRange {
  start: number;
  end: number;
  sha: string;
  evidence_ids: string[];
}

export interface Era {
  name: string;
  date_range: { start: string; end: string };
  summary: string;
  claim_ids: string[];
}

export interface KeyDecision {
  text: string;
  claim_ids: string[];
}

export interface Synthesis {
  schema_version: string;
  source_ref: string;
  eras: Era[];
  key_decisions: KeyDecision[];
}

export interface SnapshotFile {
  path: string;
  hotspot_rank: number;
  change_count: number;
  sampled_history: boolean;
  content: string;
  blame: BlameRange[];
  narrative: Narrative;
}

export interface Snapshot {
  schema_version: string;
  generated_at: string;
  repo: {
    owner: string;
    name: string;
    default_branch: string;
    last_fetched_sha: string;
  };
  synthesis: Synthesis;
  stats: {
    files_analyzed: number;
    files_total: number;
    confidence_mix: Record<ConfidenceTier, number>;
  };
  files: SnapshotFile[];
  evidence: Evidence[];
}

export interface CaseSummary {
  owner: string;
  repo: string;
  title: string;
  filesAnalyzed: number;
  confidenceMix: Record<ConfidenceTier, number>;
  generatedAt: string;
  source: 'static' | 'live';
}

export interface CaseDetail {
  owner: string;
  repo: string;
  defaultBranch: string;
  lastFetchedSha: string;
  generatedAt: string;
  synthesis: Synthesis;
  stats: Snapshot['stats'];
  files: Array<{
    path: string;
    hotspotRank: number;
    changeCount: number;
    sampledHistory: boolean;
  }>;
}

export interface FileDetail {
  path: string;
  content: string;
  blame: BlameRange[];
  narrative: Narrative;
  evidence: Evidence[];
}
