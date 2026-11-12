/**
 * Race results sites an athlete can link to from their profile. Only these are
 * accepted, so a profile can't point people at any random site. To add one,
 * add its host here AND to the check in a new database migration.
 */
export const RESULTS_HOSTS = ["dbmaxresults.co.uk", "results.hyrox.com"] as const;

/**
 * Tidies a pasted results link into the one form the database accepts:
 * https, no "www.", no #part, at most 300 characters.
 *
 *   dbmaxresults.co.uk/results.aspx?CId=16421&RId=10029
 *     -> https://dbmaxresults.co.uk/results.aspx?CId=16421&RId=10029
 *
 * Returns null for an empty box, and undefined when it isn't a link to one of
 * the results sites above.
 */
export function normaliseResultsUrl(input: string | null | undefined): string | null | undefined {
  const value = (input ?? "").trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
  if (url.username || url.password || url.port) return undefined;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!(RESULTS_HOSTS as readonly string[]).includes(host)) return undefined;
  const tidy = `https://${host}${url.pathname}${url.search}`;
  return tidy.length <= 300 ? tidy : undefined;
}
