import { createClient } from "@/lib/supabase/server";
import { getEvents } from "@/lib/data";
import { siteEnv } from "@/lib/site-env";

// Health check for the smoke test (scripts/smoke-check.mts) and uptime checks.
// Public and read-only: it says which site and commit is running, whether the
// database answers, and whether the test race is listed. Nothing secret.
export async function GET() {
  const started = Date.now();
  let db = false;
  let testRaceListed: boolean | null = null;
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("events").select("id").limit(1);
    db = !error;
    if (db) testRaceListed = (await getEvents()).some((e) => e.slug === "test-race");
  } catch {
    db = false;
  }
  const body = {
    ok: db,
    site: siteEnv(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    db,
    testRaceListed,
    ms: Date.now() - started,
  };
  return Response.json(body, { status: db ? 200 : 503, headers: { "cache-control": "no-store" } });
}
