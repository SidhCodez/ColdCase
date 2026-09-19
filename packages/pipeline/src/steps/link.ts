import { GitHubClient, GitHubPR, GitHubIssue, GitHubReviewComment } from '../github/client.js';
import { CommitRecord } from './history.js';

export interface LinkedMetadata {
  prs: Map<number, GitHubPR>;
  issues: Map<number, GitHubIssue>;
  reviewComments: Map<string, GitHubReviewComment>;
  commitToPRs: Map<string, number[]>;
  commitToIssues: Map<string, number[]>;
}

export async function linkStep(
  owner: string,
  repo: string,
  allCommits: CommitRecord[],
  githubClient?: GitHubClient
): Promise<LinkedMetadata> {
  const prs = new Map<number, GitHubPR>();
  const issues = new Map<number, GitHubIssue>();
  const reviewComments = new Map<string, GitHubReviewComment>();
  const commitToPRs = new Map<string, number[]>();
  const commitToIssues = new Map<string, number[]>();

  const client = githubClient || new GitHubClient();

  for (const commit of allCommits) {
    const prMatches = Array.from(commit.message.matchAll(/#(\d+)|pull\/(\d+)/gi));
    const issueMatches = Array.from(commit.message.matchAll(/(?:fixes|closes|resolves)\s+#(\d+)/gi));

    const prNums: number[] = [];
    for (const match of prMatches) {
      const numStr = match[1] || match[2];
      if (numStr) {
        const num = parseInt(numStr, 10);
        if (!isNaN(num)) prNums.push(num);
      }
    }

    const issueNums: number[] = [];
    for (const match of issueMatches) {
      if (match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num)) issueNums.push(num);
      }
    }

    if (prNums.length > 0) commitToPRs.set(commit.sha, prNums);
    if (issueNums.length > 0) commitToIssues.set(commit.sha, issueNums);

    for (const prNum of prNums) {
      if (!prs.has(prNum)) {
        const fetchedPr = await client.getPullRequest(owner, repo, prNum);
        if (fetchedPr) {
          fetchedPr.linked_commits.push(commit.sha);
          prs.set(prNum, fetchedPr);

          // Fetch review comments for this PR
          const comments = await client.getReviewComments(owner, repo, prNum);
          for (const comment of comments) {
            reviewComments.set(`comment:pr:${prNum}:c:${comment.id}`, comment);
          }
        }
      }
    }

    for (const issueNum of issueNums) {
      if (!issues.has(issueNum)) {
        const fetchedIssue = await client.getIssue(owner, repo, issueNum);
        if (fetchedIssue) {
          fetchedIssue.linked_commits.push(commit.sha);
          issues.set(issueNum, fetchedIssue);
        }
      }
    }
  }

  return {
    prs,
    issues,
    reviewComments,
    commitToPRs,
    commitToIssues,
  };
}
