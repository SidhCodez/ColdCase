import { simpleGit, SimpleGit } from 'simple-git';
import { shouldIgnoreFile } from '@coldcase/core';

export interface RankedFile {
  path: string;
  rank: number;
  reasons: string[];
  changeCount: number;
  score: number;
}

export async function hotspotsStep(localPath: string, topN: number = 10): Promise<RankedFile[]> {
  const git: SimpleGit = simpleGit(localPath);
  
  // Get list of tracked files
  const lsFilesRaw = await git.raw(['ls-files']);
  const allFiles = lsFilesRaw.split('\n').map(f => f.trim()).filter(Boolean);

  // Get commit counts per file
  const logRaw = await git.raw(['log', '--name-only', '--format=format:COMMIT:%H']);
  const fileCounts = new Map<string, { count: number; authors: Set<string> }>();
  
  let currentCommit = '';
  const lines = logRaw.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('COMMIT:')) {
      currentCommit = trimmed.substring(7);
      continue;
    }
    if (trimmed && !shouldIgnoreFile(trimmed)) {
      const entry = fileCounts.get(trimmed) || { count: 0, authors: new Set() };
      entry.count += 1;
      if (currentCommit) entry.authors.add(currentCommit);
      fileCounts.set(trimmed, entry);
    }
  }

  const validFiles = allFiles.filter(f => !shouldIgnoreFile(f));
  
  const ranked = validFiles.map(filePath => {
    const info = fileCounts.get(filePath) || { count: 1, authors: new Set() };
    const changeCount = info.count;
    const authorDiversity = info.authors.size;
    
    const score = changeCount * 0.6 + authorDiversity * 0.4;
    const reasons: string[] = [
      `changed ${changeCount} time${changeCount === 1 ? '' : 's'}`,
      `${authorDiversity} contributor commit${authorDiversity === 1 ? '' : 's'}`,
    ];

    return {
      path: filePath,
      rank: 0,
      reasons,
      changeCount,
      score,
    };
  });

  ranked.sort((a, b) => b.score - a.score);

  const selected = ranked.slice(0, topN).map((item, index) => ({
    ...item,
    rank: index + 1,
  }));

  return selected;
}
