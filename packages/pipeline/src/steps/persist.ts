import { Database } from 'sql.js';
import { Narrative, Synthesis, Evidence } from '@coldcase/core';
import { RankedFile } from './hotspots.js';
import { saveDatabase } from '../db/sqlite.js';

export function persistStep(
  db: Database,
  dbPath: string,
  owner: string,
  repo: string,
  defaultBranch: string,
  refSha: string,
  hotspots: RankedFile[],
  narratives: Map<string, Narrative>,
  synthesis: Synthesis,
  evidence: Map<string, Evidence>
): void {
  const now = new Date().toISOString();

  // 1. Insert or update repository
  db.run(
    `INSERT OR REPLACE INTO repositories (owner, name, default_branch, last_fetched_sha, fetched_at)
     VALUES (?, ?, ?, ?, ?)`,
    [owner, repo, defaultBranch, refSha, now]
  );

  const stmt = db.prepare(`SELECT id FROM repositories WHERE owner = ? AND name = ?`);
  stmt.bind([owner, repo]);
  stmt.step();
  const repoRow = stmt.getAsObject();
  const repoId = Number(repoRow.id || 1);
  stmt.free();

  // 2. Hotspots
  for (const h of hotspots) {
    db.run(
      `INSERT OR REPLACE INTO hotspots (repo_id, path, change_count, rank, selected_for_analysis)
       VALUES (?, ?, ?, ?, 1)`,
      [repoId, h.path, h.changeCount, h.rank]
    );
  }

  // 3. Narratives
  for (const [filePath, narrative] of narratives.entries()) {
    db.run(
      `INSERT OR REPLACE INTO narratives (repo_id, path, narrative_json, model_used, generated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [repoId, filePath, JSON.stringify(narrative), 'groq:llama-3.3-70b-versatile', now]
    );
  }

  // 4. Synthesis
  db.run(
    `INSERT OR REPLACE INTO repo_synthesis (repo_id, timeline_json, model_used, generated_at)
     VALUES (?, ?, ?, ?)`,
    [repoId, JSON.stringify(synthesis), 'gemini:gemini-1.5-pro', now]
  );

  // 5. Metadata
  db.run(
    `INSERT OR REPLACE INTO cache_metadata (key, value, updated_at) VALUES (?, ?, ?)`,
    ['run.last_repo', `${owner}/${repo}`, now]
  );

  saveDatabase(db, dbPath);
}
