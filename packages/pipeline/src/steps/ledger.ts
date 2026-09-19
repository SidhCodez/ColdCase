import { Evidence } from '@coldcase/core';
import { CommitRecord } from './history.js';
import { LinkedMetadata } from './link.js';

export interface EvidenceLedger {
  items: Map<string, Evidence>;
}

export function ledgerStep(
  allCommits: CommitRecord[],
  linkedMeta: LinkedMetadata,
  owner: string,
  repo: string
): EvidenceLedger {
  const items = new Map<string, Evidence>();

  // Add zero SHA commit fallback for uncommitted local edits
  const zeroSha = '0000000000000000000000000000000000000000';
  items.set(`commit:${zeroSha}`, {
    id: `commit:${zeroSha}`,
    type: 'commit',
    url: `https://github.com/${owner}/${repo}/commit/${zeroSha}`,
    title: 'Uncommitted working tree changes',
    body: 'Uncommitted working tree changes in local clone.',
    author: 'local',
    created_at: new Date().toISOString(),
  });

  // Add all commits as evidence items
  for (const c of allCommits) {
    const evidenceId = `commit:${c.sha}`;
    items.set(evidenceId, {
      id: evidenceId,
      type: 'commit',
      url: `https://github.com/${owner}/${repo}/commit/${c.sha}`,
      title: c.message.split('\n')[0],
      body: c.message,
      author: c.author,
      created_at: c.committed_at,
    });
  }

  // Add all PRs as evidence items
  for (const [prNum, pr] of linkedMeta.prs.entries()) {
    const evidenceId = `pr:${prNum}`;
    items.set(evidenceId, {
      id: evidenceId,
      type: 'pull_request',
      url: `https://github.com/${owner}/${repo}/pull/${prNum}`,
      title: pr.title,
      body: pr.body,
      author: pr.author,
      created_at: pr.merged_at || undefined,
    });
  }

  // Add all Issues as evidence items
  for (const [issueNum, issue] of linkedMeta.issues.entries()) {
    const evidenceId = `issue:${issueNum}`;
    items.set(evidenceId, {
      id: evidenceId,
      type: 'issue',
      url: `https://github.com/${owner}/${repo}/issues/${issueNum}`,
      title: issue.title,
      body: issue.body,
    });
  }

  // Add all Review Comments as evidence items
  for (const [commentId, comment] of linkedMeta.reviewComments.entries()) {
    items.set(commentId, {
      id: commentId,
      type: 'review_comment',
      url: `https://github.com/${owner}/${repo}/pull/${comment.prNumber}#discussion_r${comment.id}`,
      title: `Review Comment on PR #${comment.prNumber}`,
      body: comment.body,
      author: comment.author,
      created_at: comment.createdAt,
    });
  }

  return { items };
}
