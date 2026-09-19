import {
  Snapshot,
  CaseSummary,
  CaseDetail,
  FileDetail,
  Claim,
  BlameRange,
} from './types.js';

// ── Config ────────────────────────────────────────────────────────────────────
// VITE_DATA_SOURCE:  'static' (demo day, no network) | 'live' (worker available)
// VITE_WORKER_URL:   base URL of the worker e.g. http://localhost:3000
const DATA_SOURCE = (import.meta.env.VITE_DATA_SOURCE as string) || 'live';
const WORKER_URL = (import.meta.env.VITE_WORKER_URL as string) || 'http://localhost:3000';

// ── In-memory snapshot cache (normalised key: owner/repo lowercase) ──────────
const SNAPSHOTS: Record<string, Snapshot> = {};

// ── Snapshot loader ───────────────────────────────────────────────────────────
async function loadSnapshot(owner: string, repo: string): Promise<Snapshot | null> {
  const key = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
  if (SNAPSHOTS[key]) return SNAPSHOTS[key];

  const filename = `${owner}__${repo}.json`;

  // 1. Try static public/snapshots/ (bundled or dropped there by the pipeline)
  try {
    const res = await fetch(`/snapshots/${filename}`);
    if (res.ok) {
      const s = (await res.json()) as Snapshot;
      SNAPSHOTS[key] = s;
      return s;
    }
  } catch {
    // fall through
  }

  // 2. In live mode, ask the worker for the snapshot
  if (DATA_SOURCE === 'live') {
    try {
      const res = await fetch(`${WORKER_URL}/snapshot/${owner}/${repo}`);
      if (res.ok) {
        const s = (await res.json()) as Snapshot;
        SNAPSHOTS[key] = s;
        return s;
      }
    } catch {
      // fall through
    }
  }

  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function listCases(): Promise<CaseSummary[]> {
  return Object.values(SNAPSHOTS).map(s => ({
    owner: s.repo.owner,
    repo: s.repo.name,
    title: `${s.repo.owner}/${s.repo.name}`,
    filesAnalyzed: s.stats.files_analyzed,
    confidenceMix: s.stats.confidence_mix,
    generatedAt: s.generated_at,
    source: 'static' as const,
  }));
}

export async function getCase(owner: string, repo: string): Promise<CaseDetail | null> {
  const s = await loadSnapshot(owner, repo);
  if (!s) return null;

  return {
    owner: s.repo.owner,
    repo: s.repo.name,
    defaultBranch: s.repo.default_branch,
    lastFetchedSha: s.repo.last_fetched_sha,
    generatedAt: s.generated_at,
    synthesis: s.synthesis,
    stats: s.stats,
    files: s.files.map(f => ({
      path: f.path,
      hotspotRank: f.hotspot_rank,
      changeCount: f.change_count,
      sampledHistory: f.sampled_history,
    })),
  };
}

export async function getFile(
  owner: string,
  repo: string,
  filePath: string
): Promise<FileDetail | null> {
  const s = await loadSnapshot(owner, repo);
  if (!s) return null;

  // Exact match first, then case-insensitive, then first file
  const targetFile =
    s.files.find(f => f.path === filePath) ||
    s.files.find(f => f.path.toLowerCase() === filePath.toLowerCase()) ||
    s.files[0];

  if (!targetFile) return null;

  return {
    path: targetFile.path,
    content: targetFile.content,
    blame: targetFile.blame,
    narrative: targetFile.narrative,
    evidence: s.evidence,
  };
}

// ── In-process line → claims lookup (NFR-2: <200ms, zero network) ─────────────
export function findClaimsForLine(
  lineNumber: number,
  blame: BlameRange[],
  claims: Claim[]
): Claim[] {
  const range = blame.find(r => lineNumber >= r.start && lineNumber <= r.end);
  if (!range) return [];
  const rangeEvidenceIds = new Set(range.evidence_ids);
  return claims.filter(claim =>
    claim.evidence_ids.some(id => rangeEvidenceIds.has(id))
  );
}
