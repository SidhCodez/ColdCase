/**
 * Normalizes all whitespace runs (spaces, tabs, newlines) into a single space and trims.
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Checks if a normalized quote is contained verbatim in normalized evidence text.
 */
export function quoteCheck(quote: string, evidenceBody: string): boolean {
  if (!quote || !evidenceBody) return false;
  const normQuote = normalizeWhitespace(quote);
  const normBody = normalizeWhitespace(evidenceBody);
  if (!normQuote) return false;
  return normBody.includes(normQuote);
}
