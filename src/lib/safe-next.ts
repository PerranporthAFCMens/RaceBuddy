/**
 * Where to send someone after signing in. Only a path on this site is
 * allowed: "/x" yes; "//evil.com", "/\evil.com" and "https://evil.com" no
 * (browsers treat a backslash like a slash, so "/\evil.com" leaves the site).
 */
export function safeNext(next: unknown, fallback = "/browse"): string {
  if (typeof next !== "string" || !next.startsWith("/")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(next) || next.startsWith("//")) return fallback;
  // Belt and braces: the result must still be on this site.
  const base = "https://site.invalid";
  return new URL(next, base).origin === base ? next : fallback;
}
