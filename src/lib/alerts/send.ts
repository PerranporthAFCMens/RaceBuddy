import "server-only";
import { ageOn, categoryLabel, formatRaceTime } from "@/lib/format";
import { categoriesOf, situationLabel, type Situation } from "@/lib/matching";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAlertEmail, type AlertMatch } from "./email";

function groupBy<T, K>(items: T[], key: (item: T) => K) {
  const out = new Map<K, T[]>();
  for (const item of items) out.set(key(item), [...(out.get(key(item)) ?? []), item]);
  return out;
}

/** At most one alert email per person in this window. */
const QUIET_HOURS = 6;

export function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

type AlertRow = { id: string; user_id: string; for_entry_id: string; match_entry_id: string };
type EntryRow = {
  id: string;
  user_id: string;
  event_id: string;
  has_ticket: boolean;
  situation: Situation;
  category_id: string | null;
  wanted_category_ids: string[];
  spots_needed: number;
  note: string | null;
  status: string;
  alerts_email: boolean;
};

/**
 * Emails people about new matches the database has queued for them. Safe to
 * call often: it skips anyone emailed in the last few hours, and their
 * matches wait for the next run (the next listing saved, or the daily job).
 */
export async function sendPendingAlerts(onlyUserIds?: string[]) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: 0, reason: "RESEND_API_KEY is not set" };
  const from = process.env.EMAIL_FROM || "Race Buddy <onboarding@resend.dev>";
  const admin = createAdminClient();
  const site = siteUrl();

  let q = admin.from("match_alerts").select("id, user_id, for_entry_id, match_entry_id").is("emailed_at", null).limit(500);
  if (onlyUserIds?.length) q = q.in("user_id", onlyUserIds);
  const { data: pending } = await q;
  const alerts = (pending ?? []) as AlertRow[];
  if (!alerts.length) return { sent: 0 };

  const entryIds = [...new Set(alerts.flatMap((a) => [a.for_entry_id, a.match_entry_id]))];
  const { data: entryData } = await admin
    .from("entries")
    .select("id, user_id, event_id, has_ticket, situation, category_id, wanted_category_ids, spots_needed, note, status, alerts_email")
    .in("id", entryIds);
  const entries = new Map(((entryData ?? []) as EntryRow[]).map((e) => [e.id, e]));
  const userIds = [...new Set([...entries.values()].map((e) => e.user_id))];
  const eventIds = [...new Set([...entries.values()].map((e) => e.event_id))];
  const [{ data: profileData }, { data: eventData }, { data: catData }, { data: blockData }] = await Promise.all([
    admin.from("profiles").select("id, first_name, date_of_birth, home_town, region, five_k_seconds").in("id", userIds),
    admin.from("events").select("id, slug, name").in("id", eventIds),
    admin.from("categories").select("id, name, race_day, team_size").in("event_id", eventIds),
    admin.from("blocks").select("blocker_id, blocked_id").or(`blocker_id.in.(${userIds.join(",")}),blocked_id.in.(${userIds.join(",")})`),
  ]);
  type P = { id: string; first_name: string; date_of_birth: string; home_town: string | null; region: string | null; five_k_seconds: number | null };
  const profiles = new Map(((profileData ?? []) as P[]).map((p) => [p.id, p]));
  const events = new Map(((eventData ?? []) as { id: string; slug: string; name: string }[]).map((e) => [e.id, e]));
  const cats = new Map(((catData ?? []) as { id: string; name: string; race_day: string | null; team_size: number }[]).map((c) => [c.id, c]));
  const blocked = new Set(((blockData ?? []) as { blocker_id: string; blocked_id: string }[]).flatMap((b) => [`${b.blocker_id}:${b.blocked_id}`, `${b.blocked_id}:${b.blocker_id}`]));

  const since = new Date(Date.now() - QUIET_HOURS * 3600_000).toISOString();
  let sent = 0;
  const byUser = groupBy(alerts, (a) => a.user_id);

  for (const [userId, rows] of byUser) {
    // Drop alerts that no longer make sense: either listing gone, no longer
    // looking, alerts switched off, or the two have blocked each other.
    const stale: AlertRow[] = [];
    const live: AlertRow[] = [];
    for (const a of rows) {
      const mine = entries.get(a.for_entry_id);
      const theirs = entries.get(a.match_entry_id);
      const ok =
        mine && theirs && mine.status === "looking" && mine.alerts_email && theirs.status === "looking" && !blocked.has(`${userId}:${theirs.user_id}`);
      (ok ? live : stale).push(a);
    }
    if (stale.length) await admin.from("match_alerts").delete().in("id", stale.map((a) => a.id));
    if (!live.length) continue;

    const { count: recent } = await admin
      .from("match_alerts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("emailed_at", since);
    if (recent) continue;

    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const to = authUser?.user?.email;
    if (!to) continue;

    for (const [eventId, eventRows] of groupBy(live, (a) => entries.get(a.for_entry_id)!.event_id)) {
      const event = events.get(eventId);
      if (!event) continue;
      const matches: AlertMatch[] = eventRows.flatMap((a) => {
        const e = entries.get(a.match_entry_id)!;
        const p = profiles.get(e.user_id);
        if (!p) return [];
        const catNames = [...new Set(categoriesOf(e).map((id) => cats.get(id)).filter(Boolean).map((c) => categoryLabel(c!)))];
        const teamSize = e.category_id ? (cats.get(e.category_id)?.team_size ?? null) : null;
        return [
          {
            entryId: e.id,
            firstName: p.first_name,
            age: ageOn(p.date_of_birth),
            what: situationLabel({ ...e, team_size: teamSize }),
            details: [
              catNames.slice(0, 2).join(", ") + (catNames.length > 2 ? ` +${catNames.length - 2}` : ""),
              p.five_k_seconds ? `5km ${formatRaceTime(p.five_k_seconds)}` : null,
              [p.home_town, p.region].filter(Boolean).join(", ") || null,
            ]
              .filter(Boolean)
              .join(" · "),
            note: e.note,
          },
        ];
      });
      if (!matches.length) continue;
      const email = buildAlertEmail({ site, eventName: event.name, eventSlug: event.slug, matches });
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [to],
          subject: email.subject,
          html: email.html,
          text: email.text,
          headers: { "List-Unsubscribe": `<${email.settingsUrl}>` },
        }),
      });
      if (!res.ok) {
        console.error("Alert email failed", res.status, await res.text().catch(() => ""));
        continue;
      }
      await admin
        .from("match_alerts")
        .update({ emailed_at: new Date().toISOString() })
        .in("id", eventRows.map((a) => a.id));
      sent++;
    }
  }
  return { sent };
}
