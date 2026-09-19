import { describe, it, expect } from 'vitest';
import { quoteCheck, normalizeWhitespace } from '../src/quoteCheck.js';

describe('normalizeWhitespace', () => {
  it('collapses tabs, spaces, and newlines', () => {
    expect(normalizeWhitespace('hello  \n\t world  ')).toBe('hello world');
  });
});

describe('quoteCheck', () => {
  it('returns true when quote is in body verbatim after whitespace normalization', () => {
    const quote = 'refactored database\nconnection pool';
    const body = 'We refactored  database connection pool to improve latency.';
    expect(quoteCheck(quote, body)).toBe(true);
  });

  it('returns false when quote is not present', () => {
    expect(quoteCheck('missing quote', 'some other text')).toBe(false);
  });

  it('returns false for empty inputs', () => {
    expect(quoteCheck('', 'body text')).toBe(false);
    expect(quoteCheck('quote', '')).toBe(false);
  });
});
