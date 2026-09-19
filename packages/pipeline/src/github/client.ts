import { Octokit } from 'octokit';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface GitHubPR {
  number: number;
  title: string;
  body: string;
  merged_at: string | null;
  author: string;
  linked_commits: string[];
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  linked_commits: string[];
}

export interface GitHubReviewComment {
  id: string;
  prNumber: number;
  author: string;
  body: string;
  path: string;
  line?: number;
  createdAt: string;
}

export class GitHubClient {
  private octokit: Octokit;
  private cacheDir: string;

  constructor(token?: string, cacheDir: string = '.cache/github') {
    this.octokit = new Octokit({ auth: token || process.env.GITHUB_TOKEN });
    this.cacheDir = cacheDir;
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getCachePath(key: string): string {
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    return path.join(this.cacheDir, `${hash}.json`);
  }

  private getCached<T>(key: string): T | null {
    const cachePath = this.getCachePath(key);
    if (fs.existsSync(cachePath)) {
      try {
        const data = fs.readFileSync(cachePath, 'utf-8');
        return JSON.parse(data) as T;
      } catch {
        return null;
      }
    }
    return null;
  }

  private setCached<T>(key: string, data: T): void {
    const cachePath = this.getCachePath(key);
    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2));
  }

  async getPullRequest(owner: string, repo: string, prNumber: number): Promise<GitHubPR | null> {
    const cacheKey = `pr:${owner}:${repo}:${prNumber}`;
    const cached = this.getCached<GitHubPR>(cacheKey);
    if (cached) return cached;

    try {
      const res = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });

      const pr: GitHubPR = {
        number: res.data.number,
        title: res.data.title || '',
        body: res.data.body || '',
        merged_at: res.data.merged_at || null,
        author: res.data.user?.login || 'unknown',
        linked_commits: res.data.merge_commit_sha ? [res.data.merge_commit_sha] : [],
      };

      this.setCached(cacheKey, pr);
      return pr;
    } catch {
      return null;
    }
  }

  async getIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue | null> {
    const cacheKey = `issue:${owner}:${repo}:${issueNumber}`;
    const cached = this.getCached<GitHubIssue>(cacheKey);
    if (cached) return cached;

    try {
      const res = await this.octokit.rest.issues.get({
        owner,
        repo,
        issue_number: issueNumber,
      });

      const issue: GitHubIssue = {
        number: res.data.number,
        title: res.data.title || '',
        body: res.data.body || '',
        state: res.data.state === 'closed' ? 'closed' : 'open',
        linked_commits: [],
      };

      this.setCached(cacheKey, issue);
      return issue;
    } catch {
      return null;
    }
  }

  async getReviewComments(owner: string, repo: string, prNumber: number): Promise<GitHubReviewComment[]> {
    const cacheKey = `review_comments:${owner}:${repo}:${prNumber}`;
    const cached = this.getCached<GitHubReviewComment[]>(cacheKey);
    if (cached) return cached;

    try {
      const res = await this.octokit.rest.pulls.listReviewComments({
        owner,
        repo,
        pull_number: prNumber,
      });

      const comments: GitHubReviewComment[] = res.data.map(c => ({
        id: String(c.id),
        prNumber,
        author: c.user?.login || 'unknown',
        body: c.body,
        path: c.path,
        line: c.line || undefined,
        createdAt: c.created_at,
      }));

      this.setCached(cacheKey, comments);
      return comments;
    } catch {
      return [];
    }
  }
}
