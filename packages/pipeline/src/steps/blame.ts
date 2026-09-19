import { simpleGit, SimpleGit } from 'simple-git';
import { BlameRange } from '@coldcase/core';
import fs from 'node:fs';
import path from 'node:path';

export interface BlameStepResult {
  path: string;
  content: string;
  blame: BlameRange[];
}

export async function blameStep(
  localPath: string,
  filePaths: string[]
): Promise<Map<string, BlameStepResult>> {
  const git: SimpleGit = simpleGit(localPath);
  const result = new Map<string, BlameStepResult>();

  for (const filePath of filePaths) {
    const absolutePath = path.resolve(localPath, filePath);
    let content = '';
    if (fs.existsSync(absolutePath)) {
      content = fs.readFileSync(absolutePath, 'utf-8');
    }

    try {
      const rawBlame = await git.raw(['blame', '-w', '-l', filePath]);
      const lines = rawBlame.split('\n');

      const blameRanges: BlameRange[] = [];
      let currentSha = '';
      let rangeStart = 1;
      let lineNum = 1;

      for (const line of lines) {
        if (!line.trim()) continue;
        const shaMatch = line.match(/^([a-f0-9]{40})/);
        const sha = shaMatch ? shaMatch[1] : '0000000000000000000000000000000000000000';

        if (sha !== currentSha) {
          if (currentSha && lineNum > rangeStart) {
            blameRanges.push({
              start: rangeStart,
              end: lineNum - 1,
              sha: currentSha,
              evidence_ids: [`commit:${currentSha}`],
            });
          }
          currentSha = sha;
          rangeStart = lineNum;
        }
        lineNum++;
      }

      if (currentSha && lineNum > rangeStart) {
        blameRanges.push({
          start: rangeStart,
          end: lineNum - 1,
          sha: currentSha,
          evidence_ids: [`commit:${currentSha}`],
        });
      }

      result.set(filePath, {
        path: filePath,
        content,
        blame: blameRanges,
      });
    } catch {
      // Fallback if git blame fails
      const totalLines = content.split('\n').length || 1;
      const fallbackSha = '0000000000000000000000000000000000000000';
      result.set(filePath, {
        path: filePath,
        content,
        blame: [
          {
            start: 1,
            end: totalLines,
            sha: fallbackSha,
            evidence_ids: [`commit:${fallbackSha}`],
          },
        ],
      });
    }
  }

  return result;
}
