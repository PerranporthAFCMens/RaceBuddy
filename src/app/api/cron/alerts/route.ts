import { sendPendingAlerts } from "@/lib/alerts/send";

// Daily catch-up for match alert emails that were held back by the 6-hour
// limit. Vercel Cron calls this (see vercel.json). When CRON_SECRET is set,
// Vercel sends it as a bearer token and anyone else is turned away.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result = await sendPendingAlerts();
  return Response.json(result);
}
