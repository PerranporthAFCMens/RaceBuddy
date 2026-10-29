/**
 * The project URL Supabase clients expect, e.g. https://abc.supabase.co.
 * Copying the "API URL" from the dashboard can add /rest/v1/ on the end,
 * which breaks every request, so trim that and any trailing slash.
 */
export function supabaseBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
}
