import fs from 'node:fs';
import path from 'node:path';
import { Snapshot, ConfidenceTier } from '@coldcase/core';
import { RankedFile } from './hotspots.js';
import { BlameStepResult } from './blame.js';
import { Narrative, Synthesis, Evidence } from '@coldcase/core';

export function exportStep(
  owner: string,
  repo: string,
  defaultBranch: string,
  refSha: string,
  hotspots: RankedFile[],
  blameMap: Map<string, BlameStepResult>,
  narrativeMap: Map<string, Narrative>,
  synthesis: Synthesis,
  evidenceLedger: Map<string, Evidence>,
  outDir: string = 'data/demo'
): Snapshot {
  const confidenceMix: Record<ConfidenceTier, number> = {
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    NONE: 0,
  };

  const snapshotFiles = hotspots.map(h => {
    const blameObj = blameMap.get(h.path) || { path: h.path, content: '', blame: [] };
    const narrativeObj = narrativeMap.get(h.path) || {
      schema_version: '1.0.0',
      path: h.path,
      source_ref: `${owner}/${repo}@${refSha}`,
      sampled_history: false,
      claims: [],
    };

    for (const claim of narrativeObj.claims) {
      confidenceMix[claim.confidence_tier] = (confidenceMix[claim.confidence_tier] || 0) + 1;
    }

    return {
      path: h.path,
      hotspot_rank: h.rank,
      change_count: h.changeCount,
      sampled_history: narrativeObj.sampled_history,
      content: blameObj.content,
      blame: blameObj.blame,
      narrative: narrativeObj,
    };
  });

  const snapshot: Snapshot = {
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    repo: {
      owner,
      name: repo,
      default_branch: defaultBranch,
      last_fetched_sha: refSha,
    },
    synthesis,
    stats: {
      files_analyzed: snapshotFiles.length,
      files_total: hotspots.length,
      confidence_mix: confidenceMix,
    },
    files: snapshotFiles,
    evidence: Array.from(evidenceLedger.values()),
  };

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const filename = `${owner}__${repo}.json`;
  const filePath = path.join(outDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));

  // Also copy snapshot to apps/web/public/snapshots for Vite bundled demo
  const webPublicDir = path.resolve(process.cwd(), 'apps', 'web', 'public', 'snapshots');
  if (!fs.existsSync(webPublicDir)) {
    fs.mkdirSync(webPublicDir, { recursive: true });
  }
  fs.writeFileSync(path.join(webPublicDir, filename), JSON.stringify(snapshot, null, 2));

  return snapshot;
}
