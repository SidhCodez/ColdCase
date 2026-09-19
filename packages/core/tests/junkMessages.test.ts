import { describe, it, expect } from 'vitest';
import { isJunkCommitMessage, isSubstantiveText } from '../src/junkMessages.js';

describe('isJunkCommitMessage', () => {
  it('identifies short or vague messages as junk', () => {
    expect(isJunkCommitMessage('fix')).toBe(true);
    expect(isJunkCommitMessage('wip')).toBe(true);
    expect(isJunkCommitMessage('update')).toBe(true);
    expect(isJunkCommitMessage('cleanup')).toBe(true);
    expect(isJunkCommitMessage('...')).toBe(true);
  });

  it('identifies descriptive messages as non-junk', () => {
    expect(
      isJunkCommitMessage('fix(auth): resolve session invalidation bug on logout')
    ).toBe(false);
  });
});

describe('isSubstantiveText', () => {
  it('rejects short text or boilerplate', () => {
    expect(isSubstantiveText('too short')).toBe(false);
    expect(
      isSubstantiveText('<!-- template --> Please describe your changes here in detail.')
    ).toBe(false);
  });

  it('accepts substantive text', () => {
    expect(
      isSubstantiveText(
        'This pull request replaces the default memory cache with a Redis client to support multi-node scaling.'
      )
    ).toBe(true);
  });
});
