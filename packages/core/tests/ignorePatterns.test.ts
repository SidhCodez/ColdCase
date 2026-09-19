import { describe, it, expect } from 'vitest';
import { shouldIgnoreFile } from '../src/ignorePatterns.js';

describe('shouldIgnoreFile', () => {
  it('ignores lockfiles', () => {
    expect(shouldIgnoreFile('package-lock.json')).toBe(true);
    expect(shouldIgnoreFile('yarn.lock')).toBe(true);
    expect(shouldIgnoreFile('Cargo.lock')).toBe(true);
  });

  it('ignores vendor and build folders', () => {
    expect(shouldIgnoreFile('dist/bundle.js')).toBe(true);
    expect(shouldIgnoreFile('vendor/lib.js')).toBe(true);
    expect(shouldIgnoreFile('node_modules/express/index.js')).toBe(true);
  });

  it('allows source code files', () => {
    expect(shouldIgnoreFile('src/index.ts')).toBe(false);
    expect(shouldIgnoreFile('lib/utils.py')).toBe(false);
  });
});
