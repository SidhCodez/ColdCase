export const IGNORE_PATTERNS: RegExp[] = [
  // Lockfiles
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /Gemfile\.lock$/,
  /Cargo\.lock$/,
  /composer\.lock$/,
  /poetry\.lock$/,

  // Build / Generated / Dist
  /^dist\//,
  /^build\//,
  /^\.next\//,
  /^\.cache\//,
  /^out\//,
  /\.min\.js$/,
  /\.min\.css$/,
  /\.map$/,

  // Vendor
  /^vendor\//,
  /^node_modules\//,
  /^third_party\//,

  // Binary / Media
  /\.(png|jpg|jpeg|gif|svg|ico|pdf|zip|tar|gz|7z|mp4|mp3|woff|woff2|eot|ttf|otf)$/i,
];

/**
 * Evaluates whether a file path should be ignored during hotspot selection.
 */
export function shouldIgnoreFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return IGNORE_PATTERNS.some(pattern => pattern.test(normalized));
}
