import "server-only";
import { emailFrom } from "@/lib/alerts/send";
import { reportCategoryLabel } from "@/lib/safety";
import { siteUrl } from "@/lib/site-env";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAdminReportEmail, buildOrganiserReportEmail } from "./email";

type Email = { subject: string; text: string; html: string };

async function send(apiKey: string, to: string, email: Email) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: emailFrom(), to: [to], subject: email.subject, text: email.text, html: email.html }),
  });
  if (!res.ok) console.error("Report email failed", res.status, await res.text().catch(() => ""));
}

/**
 * Emails the site admins about a new report (with a link to it), and gives
 * the organisers of each upcoming race the reported person is listed on a
 * short heads-up that a report is being reviewed (no names or messages).
 * Runs after the reporter has had their answer, so it never slows them down.
 */
export async function notifyNewReport(reportId: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const db = createAdminClient();
  const site = siteUrl();

  const { data: report } = await db
    .from("reports")
    .select("id, category, priority, reported_id, created_at")
    .eq("id", reportId)
    .maybeSingle();
  if (!report) return;

  const today = new Date().toISOString().slice(0, 10);
  const [{ data: profile }, { data: entries }, { data: admins }] = await Promise.all([
    db.from("profiles").select("first_name").eq("id", report.reported_id).maybeSingle(),
    db.from("entries").select("event:events!inner(id, name, organiser_id, ends_on)").eq("user_id", report.reported_id),
    db.from("admins").select("user_id"),
  ]);
  type Ev = { id: string; name: string; organiser_id: string | null; ends_on: string };
  const events = [
    ...new Map(
      ((entries ?? []) as unknown as { event: Ev }[])
        .map((e) => e.event)
        .filter((e) => e && e.ends_on >= today)
        .map((e) => [e.id, e]),
    ).values(),
  ];
  const adminIds = new Set(((admins ?? []) as { user_id: string }[]).map((a) => a.user_id));

  const emailOf = async (userId: string) => (await db.auth.admin.getUserById(userId)).data?.user?.email ?? null;

  const adminEmail = buildAdminReportEmail({
    site,
    reportId: report.id,
    category: reportCategoryLabel(report.category),
    priority: report.priority,
    reportedName: (profile as { first_name: string } | null)?.first_name ?? null,
    eventNames: events.map((e) => e.name),
    createdAt: report.created_at,
  });
  const jobs: Promise<void>[] = [];
  for (const id of adminIds) {
    jobs.push(emailOf(id).then((to) => (to ? send(apiKey, to, adminEmail) : undefined)));
  }

  const orgIds = [...new Set(events.map((e) => e.organiser_id).filter((id): id is string => Boolean(id)))];
  if (orgIds.length) {
    const { data: owners } = await db.from("organiser_owners").select("organiser_id, user_id").in("organiser_id", orgIds);
    for (const ev of events) {
      const people = new Set(
        ((owners ?? []) as { organiser_id: string; user_id: string }[])
          .filter((o) => o.organiser_id === ev.organiser_id && !adminIds.has(o.user_id))
          .map((o) => o.user_id),
      );
      const email = buildOrganiserReportEmail({ site, eventName: ev.name, createdAt: report.created_at });
      for (const id of people) jobs.push(emailOf(id).then((to) => (to ? send(apiKey, to, email) : undefined)));
    }
  }
  await Promise.allSettled(jobs);
}
