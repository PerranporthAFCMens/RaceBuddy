import { createHash, timingSafeEqual } from "node:crypto";
import { sendPendingAlerts } from "@/lib/alerts/send";

function timingSafeEqualText(a: string, b: string) {
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(a), hash(b));
}

// Daily catch-up for match alert emails that were held back by the 6-hour
// limit. Vercel Cron calls this (see vercel.json) and sends CRON_SECRET as a
// bearer token; anyone else is turned away. On Vercel the job stays shut
// until CRON_SECRET is set, so it can never run open to the world.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.VERCEL) {
    return new Response("CRON_SECRET is not set", { status: 503 });
  }
  if (secret && !timingSafeEqualText(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result = await sendPendingAlerts();
  return Response.json(result);
}
