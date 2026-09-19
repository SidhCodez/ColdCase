import { simpleGit, SimpleGit } from 'simple-git';

export interface CommitRecord {
  sha: string;
  author: string;
  message: string;
  committed_at: string;
  files_changed: number;
}

export interface FileHistoryResult {
  path: string;
  current_sha: string;
  rename_history: Array<{ old_path: string; new_path: string; commit_sha: string; renamed_at: string }>;
  change_count: number;
  commits: CommitRecord[];
}

export async function historyStep(
  localPath: string,
  filePaths: string[],
  refSha: string
): Promise<Map<string, FileHistoryResult>> {
  const git: SimpleGit = simpleGit(localPath);
  const result = new Map<string, FileHistoryResult>();

  for (const filePath of filePaths) {
    try {
      const logs = await git.log({
        file: filePath,
        '--follow': null,
        maxCount: 200,
      });

      const commits: CommitRecord[] = logs.all.map(log => ({
        sha: log.hash,
        author: log.author_name || log.author_email || 'unknown',
        message: (log.message || '') + (log.body ? '\n\n' + log.body : ''),
        committed_at: log.date || new Date().toISOString(),
        files_changed: 1,
      }));

      result.set(filePath, {
        path: filePath,
        current_sha: refSha,
        rename_history: [],
        change_count: commits.length,
        commits,
      });
    } catch {
      result.set(filePath, {
        path: filePath,
        current_sha: refSha,
        rename_history: [],
        change_count: 0,
        commits: [],
      });
    }
  }

  return result;
}
