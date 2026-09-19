const JUNK_PATTERNS = [
  /^fix$/i,
  /^wip$/i,
  /^update$/i,
  /^misc$/i,
  /^changes$/i,
  /^cleanup$/i,
  /^refactor$/i,
  /^typo$/i,
  /^style$/i,
  /^merge branch .*/i,
  /^update .*/i,
];

/**
 * Evaluates whether a commit message is considered junk/low-signal.
 */
export function isJunkCommitMessage(message: string): boolean {
  if (!message) return true;
  const trimmed = message.trim();
  if (trimmed.length < 15) return true;
  if (/^[^\w\s]+$/.test(trimmed)) return true; // Punctuation only
  
  const subject = trimmed.split('\n')[0].trim();
  return JUNK_PATTERNS.some(pattern => pattern.test(subject));
}

/**
 * Checks if evidence text contains substantive reasoning (not template boilerplate or < 50 chars).
 */
export function isSubstantiveText(body: string): boolean {
  if (!body) return false;
  // Remove HTML comments
  const stripped = body.replace(/<!--[\s\S]*?-->/g, '').trim();
  if (stripped.length < 50) return false;
  
  // Check for PR template boilerplate prompts
  if (stripped.toLowerCase().startsWith('please describe') || stripped.toLowerCase().startsWith('## description\n\nplease')) {
    return false;
  }
  
  return true;
}
