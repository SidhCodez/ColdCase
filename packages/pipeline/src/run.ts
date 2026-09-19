import { logStep } from './util/log.js';
import { getDatabase } from './db/sqlite.js';
import { GitHubClient } from './github/client.js';
import { LLMClient } from './llm/index.js';
import {
  ingestStep,
  hotspotsStep,
  historyStep,
  blameStep,
  linkStep,
  ledgerStep,
  packStep,
  storiesStep,
  verifyStep,
  confidenceStep,
  summaryStep,
  persistStep,
  exportStep,
  invariantsStep,
} from './steps/index.js';
import { Narrative } from '@coldcase/core';

export interface PipelineOptions {
  repo: string;
  top?: number;
  out?: string;
  db?: string;
  dryRun?: boolean;
  onStep?: (step: string) => void;
}

export async function runPipeline(options: PipelineOptions): Promise<void> {
  const startTime = Date.now();
  const topN = options.top || 10;
  const dbPath = options.db || '.cache/coldcase.db';
  const outDir = options.out || 'data/demo';
  const notify = options.onStep || (() => {});

  // 1. Ingest
  notify('cloning');
  const t0 = Date.now();
  const ingest = await ingestStep(options.repo);
  logStep({ step: 'ingest', status: 'ok', ref_sha: ingest.refSha, duration_ms: Date.now() - t0 });

  // 2. Hotspots
  notify('ranking');
  const t1 = Date.now();
  const hotspots = await hotspotsStep(ingest.localPath, topN);
  logStep({ step: 'hotspots', status: 'ok', count: hotspots.length, duration_ms: Date.now() - t1 });

  const selectedPaths = hotspots.map(h => h.path);

  // 3. History
  notify('linking');
  const t2 = Date.now();
  const historyMap = await historyStep(ingest.localPath, selectedPaths, ingest.refSha);
  logStep({ step: 'history', status: 'ok', files: historyMap.size, duration_ms: Date.now() - t2 });

  // 4. Blame
  const t3 = Date.now();
  const blameMap = await blameStep(ingest.localPath, selectedPaths);
  logStep({ step: 'blame', status: 'ok', files: blameMap.size, duration_ms: Date.now() - t3 });

  // 5. Link
  const t4 = Date.now();
  const allCommits = Array.from(historyMap.values()).flatMap(h => h.commits);
  
  // Ensure all blame SHAs are in allCommits
  const existingShas = new Set(allCommits.map(c => c.sha));
  const missingShas = new Set<string>();
  
  for (const blame of blameMap.values()) {
    for (const range of blame.blame) {
      if (range.sha !== '0000000000000000000000000000000000000000' && !existingShas.has(range.sha)) {
        missingShas.add(range.sha);
      }
    }
  }

  if (missingShas.size > 0) {
    const { simpleGit } = await import('simple-git');
    const git = simpleGit(ingest.localPath);
    for (const sha of missingShas) {
      try {
        const log = await git.log({ '-1': null, [sha]: null });
        if (log.latest) {
          allCommits.push({
            sha: log.latest.hash,
            author: log.latest.author_name || log.latest.author_email || 'unknown',
            message: log.latest.message + (log.latest.body ? '\n\n' + log.latest.body : ''),
            committed_at: log.latest.date || new Date().toISOString(),
            files_changed: 1,
          });
        }
      } catch (e) {
        // Fallback
        allCommits.push({
          sha,
          author: 'unknown',
          message: 'Commit message not found',
          committed_at: new Date().toISOString(),
          files_changed: 1,
        });
      }
    }
  }

  const githubClient = new GitHubClient();
  const linkedMeta = await linkStep(ingest.owner, ingest.repo, allCommits, githubClient);
  logStep({ step: 'link', status: 'ok', prs: linkedMeta.prs.size, issues: linkedMeta.issues.size, duration_ms: Date.now() - t4 });

  // 6. Ledger
  const t5 = Date.now();
  const ledger = ledgerStep(allCommits, linkedMeta, ingest.owner, ingest.repo);
  logStep({ step: 'ledger', status: 'ok', items: ledger.items.size, duration_ms: Date.now() - t5 });

  if (options.dryRun) {
    logStep({ step: 'dry-run', status: 'ok', message: 'Stopping before LLM execution.' });
    return;
  }

  // 7-10. Pack -> Stories -> Verify -> Confidence per file
  notify('writing');
  const t6 = Date.now();
  const llmClient = new LLMClient();
  const narrativeMap = new Map<string, Narrative>();

  for (const filePath of selectedPaths) {
    const history = historyMap.get(filePath)!;
    const packed = packStep(history, ledger, linkedMeta);
    const draftNarrative = await storiesStep(packed, ingest.owner, ingest.repo, ingest.refSha, llmClient);
    const verifiedNarrative = verifyStep(draftNarrative, ledger);
    const finalNarrative = confidenceStep(verifiedNarrative, ledger);

    narrativeMap.set(filePath, finalNarrative);
  }
  logStep({ step: 'stories', status: 'ok', processed: narrativeMap.size, duration_ms: Date.now() - t6 });

  // 11. Summary (Synthesis)
  notify('summarizing');
  const t7 = Date.now();
  const synthesis = await summaryStep(Array.from(narrativeMap.values()), ingest.owner, ingest.repo, ingest.refSha, llmClient);
  logStep({ step: 'summary', status: 'ok', eras: synthesis.eras.length, duration_ms: Date.now() - t7 });

  // 12. Persist to SQLite
  notify('persisting');
  const t8 = Date.now();
  const db = await getDatabase(dbPath);
  persistStep(
    db,
    dbPath,
    ingest.owner,
    ingest.repo,
    ingest.defaultBranch,
    ingest.refSha,
    hotspots,
    narrativeMap,
    synthesis,
    ledger.items
  );
  logStep({ step: 'persist', status: 'ok', duration_ms: Date.now() - t8 });

  // 13. Export JSON Snapshot
  notify('verifying');
  const t9 = Date.now();
  const snapshot = exportStep(
    ingest.owner,
    ingest.repo,
    ingest.defaultBranch,
    ingest.refSha,
    hotspots,
    blameMap,
    narrativeMap,
    synthesis,
    ledger.items,
    outDir
  );
  logStep({ step: 'export', status: 'ok', duration_ms: Date.now() - t9 });

  // 14. Invariants Check
  const t10 = Date.now();
  invariantsStep(snapshot);
  logStep({ step: 'invariants', status: 'ok', duration_ms: Date.now() - t10 });

  const totalDuration = Date.now() - startTime;
  logStep({
    step: 'complete',
    status: 'ok',
    files_analyzed: snapshot.stats.files_analyzed,
    claims_total: snapshot.stats.files_analyzed,
    duration_ms: totalDuration,
  });
}
