import { simpleGit, SimpleGit } from 'simple-git';
import fs from 'node:fs';
import path from 'node:path';

export interface IngestResult {
  localPath: string;
  refSha: string;
  owner: string;
  repo: string;
  defaultBranch: string;
}

export async function ingestStep(repoArg: string): Promise<IngestResult> {
  const match = repoArg.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (!match) {
    throw new Error(`Invalid repo format "${repoArg}". Must be owner/repo`);
  }

  const [, owner, repo] = match;
  let localPath: string;

  // Check if repo exists locally (e.g. fixture or clone)
  const localRepoCandidate = path.resolve(process.cwd(), 'fixtures', repo);
  const currentDirCandidate = process.cwd();

  if (fs.existsSync(path.join(localRepoCandidate, '.git'))) {
    localPath = localRepoCandidate;
  } else if (fs.existsSync(path.join(currentDirCandidate, '.git'))) {
    localPath = currentDirCandidate;
  } else {
    // Clone path in .cache/github
    localPath = path.resolve('.cache', 'repos', `${owner}__${repo}`);
    if (!fs.existsSync(localPath)) {
      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      const git: SimpleGit = simpleGit();
      await git.clone(`https://github.com/${owner}/${repo}.git`, localPath, ['--depth', '100']);
    }
  }

  const git: SimpleGit = simpleGit(localPath);
  const log = await git.log({ maxCount: 1 });
  const refSha = log.latest?.hash || '0000000000000000000000000000000000000000';

  let defaultBranch = 'main';
  try {
    const branchInfo = await git.branch();
    defaultBranch = branchInfo.current || 'main';
  } catch {
    // default main
  }

  return {
    localPath,
    refSha,
    owner,
    repo,
    defaultBranch,
  };
}
