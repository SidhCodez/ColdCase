import { CommitRecord, FileHistoryResult } from './history.js';
import { EvidenceLedger } from './ledger.js';
import { LinkedMetadata } from './link.js';

export interface PackedEvidence {
  path: string;
  current_sha: string;
  rename_chain: string;
  sampled_history: boolean;
  packedText: string;
}

export function packStep(
  history: FileHistoryResult,
  ledger: EvidenceLedger,
  linkedMeta: LinkedMetadata
): PackedEvidence {
  const commits = history.commits;
  let sampled_history = false;

  // Prioritize commits within budget (8,000 tokens ≈ 32,000 chars)
  const MAX_CHARS = 32000;
  
  // Sort commits by score
  const scoredCommits = commits.map(c => {
    let score = 0;
    const hasPR = linkedMeta.commitToPRs.has(c.sha);
    const hasIssue = linkedMeta.commitToIssues.has(c.sha);
    if (hasPR || hasIssue) score += 10;
    if (/fix|bug|revert|perf|breaking/i.test(c.message)) score += 5;
    return { commit: c, score };
  });

  scoredCommits.sort((a, b) => b.score - a.score);

  let currentChars = 0;
  const includedCommits: CommitRecord[] = [];

  for (const item of scoredCommits) {
    const textLen = item.commit.message.length + 100;
    if (currentChars + textLen <= MAX_CHARS) {
      includedCommits.push(item.commit);
      currentChars += textLen;
    } else {
      sampled_history = true;
    }
  }

  let packedText = `=== FILE HEADER ===\npath: ${history.path}\ncurrent_sha: ${history.current_sha}\nsampled_history: ${sampled_history}\n\n=== COMMITS ===\n`;

  for (const c of includedCommits) {
    const prNums = linkedMeta.commitToPRs.get(c.sha) || [];
    const issueNums = linkedMeta.commitToIssues.get(c.sha) || [];
    const linkedIds = [
      ...prNums.map(n => `pr:${n}`),
      ...issueNums.map(n => `issue:${n}`),
    ].join(', ');

    packedText += `--- commit:${c.sha} ---\ndate: ${c.committed_at}\nauthor: ${c.author}\nmessage: ${c.message}\nlinked_evidence: ${linkedIds || '(none)'}\n\n`;
  }

  // Include referenced PRs
  packedText += `=== PULL REQUESTS ===\n`;
  for (const c of includedCommits) {
    const prNums = linkedMeta.commitToPRs.get(c.sha) || [];
    for (const prNum of prNums) {
      const pr = linkedMeta.prs.get(prNum);
      if (pr) {
        packedText += `--- pr:${prNum} ---\ntitle: ${pr.title}\nbody:\n${pr.body}\n\n`;
      }
    }
  }

  // Include referenced Issues
  packedText += `=== ISSUES ===\n`;
  for (const c of includedCommits) {
    const issueNums = linkedMeta.commitToIssues.get(c.sha) || [];
    for (const issueNum of issueNums) {
      const issue = linkedMeta.issues.get(issueNum);
      if (issue) {
        packedText += `--- issue:${issueNum} ---\ntitle: ${issue.title}\nbody:\n${issue.body}\n\n`;
      }
    }
  }

  return {
    path: history.path,
    current_sha: history.current_sha,
    rename_chain: history.rename_history.map(r => r.old_path).join(' -> '),
    sampled_history,
    packedText,
  };
}
