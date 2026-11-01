import { isDev } from "@/lib/site-env";

// security-check: public route
// Dev site only: throws on purpose so we can see a crash reach Sentry.
// Returns 404 everywhere else, including the live site.
export async function GET() {
  if (!isDev()) return new Response("Not found", { status: 404 });
  throw new Error("Sentry test crash from the dev site (on purpose)");
}
