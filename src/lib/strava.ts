/**
 * Tidies a pasted Strava profile link into the one form the database accepts.
 *
 *   strava.com/athletes/12345, www.strava.com/athletes/12345?ref=x
 *     -> https://www.strava.com/athletes/12345
 *   https://strava.app.link/AbC123 (the app's "Share profile" link)
 *     -> https://strava.app.link/AbC123
 *
 * Returns null for an empty box, and undefined when it isn't a Strava
 * profile link.
 */
export function normaliseStravaUrl(input: string | null | undefined): string | null | undefined {
  const value = (input ?? "").trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return undefined;
  }
  const host = url.hostname.toLowerCase();
  if (host === "strava.com" || host === "www.strava.com" || host === "m.strava.com") {
    const id = url.pathname.match(/^\/athletes\/(\d{1,15})\/?$/)?.[1];
    return id ? `https://www.strava.com/athletes/${id}` : undefined;
  }
  if (host === "strava.app.link") {
    const code = url.pathname.match(/^\/([A-Za-z0-9]{1,40})\/?$/)?.[1];
    return code ? `https://strava.app.link/${code}` : undefined;
  }
  return undefined;
}
