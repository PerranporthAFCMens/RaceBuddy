/** Chat helpers with no React or database in them, so they're easy to test. */

/** The reactions people can add, in the order the picker shows them. */
export const REACTIONS = ["👍", "❤️", "😂", "🔥", "💪", "🙌"] as const;
export type ReactionEmoji = (typeof REACTIONS)[number];

/** Everyone using the app is in the UK, so show UK times on server and phone alike. */
const ZONE = "Europe/London";

/** Messages from one person this close together sit in one group. */
const GROUP_GAP_MS = 5 * 60 * 1000;

const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONE }).format(new Date(iso));

/** "18:42", 24-hour, UK time. */
export function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** "Today", "Yesterday", or "Mon 3 Nov" (with the year if it isn't this year). */
export function dayLabel(iso: string, now = new Date()): string {
  const day = dayKey(iso);
  if (day === dayKey(now.toISOString())) return "Today";
  if (day === dayKey(new Date(now.getTime() - 86_400_000).toISOString())) return "Yesterday";
  const sameYear = day.slice(0, 4) === dayKey(now.toISOString()).slice(0, 4);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  })
    .format(new Date(iso))
    .replace(",", "");
}

type Timed = { sender_id: string; created_at: string };

export type ChatRow<M> =
  | { kind: "day"; key: string; label: string }
  | { kind: "message"; key: string; message: M; first: boolean; last: boolean };

/**
 * Lays messages out for the screen: a day divider when the day changes, and
 * each message marked as the first or last of its group (same person, same
 * day, within 5 minutes), so names and times show once per group.
 */
export function layoutMessages<M extends Timed & { id: string }>(messages: M[], now = new Date()): ChatRow<M>[] {
  const rows: ChatRow<M>[] = [];
  const joins = (a: M | undefined, b: M | undefined) =>
    !!a &&
    !!b &&
    a.sender_id === b.sender_id &&
    dayKey(a.created_at) === dayKey(b.created_at) &&
    Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) <= GROUP_GAP_MS;
  messages.forEach((m, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    if (!prev || dayKey(prev.created_at) !== dayKey(m.created_at)) {
      rows.push({ kind: "day", key: `day-${dayKey(m.created_at)}`, label: dayLabel(m.created_at, now) });
    }
    rows.push({ kind: "message", key: m.id, message: m, first: !joins(prev, m), last: !joins(m, next) });
  });
  return rows;
}

/** Web links in a message, so they can be shown as tappable links. Only http(s). */
export function findLinks(text: string): { href: string; label: string }[] {
  const out: { href: string; label: string }[] = [];
  for (const match of text.matchAll(/\bhttps?:\/\/[^\s<>"']+/gi)) {
    const raw = match[0].replace(/[).,!?;:]+$/, "");
    try {
      const url = new URL(raw);
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      if (!out.some((l) => l.href === url.href)) out.push({ href: url.href, label: url.hostname.replace(/^www\./, "") });
    } catch {
      // Not a real link; leave it as text.
    }
  }
  return out.slice(0, 3);
}

export type ReactionRow = { id: string; message_id: string; user_id: string; emoji: string };

/** Reactions on one message, counted per emoji in picker order, and whether you added each. */
export function summariseReactions(rows: ReactionRow[], me: string) {
  const order = (e: string) => {
    const i = (REACTIONS as readonly string[]).indexOf(e);
    return i === -1 ? REACTIONS.length : i;
  };
  const byEmoji = new Map<string, { emoji: string; count: number; mine: boolean; who: string[] }>();
  for (const r of rows) {
    const s = byEmoji.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false, who: [] };
    s.count += 1;
    s.mine ||= r.user_id === me;
    s.who.push(r.user_id);
    byEmoji.set(r.emoji, s);
  }
  return [...byEmoji.values()].sort((a, b) => order(a.emoji) - order(b.emoji));
}

/** A one-line preview of a message for reply quotes. */
export function snippet(body: string, max = 80): string {
  const line = body.replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

/**
 * Who has read up to a message: everyone else whose "last read" time is at or
 * after it. Used for "Seen" under your latest message.
 */
export function seenBy(createdAt: string, others: { user_id: string; last_read_at: string }[]): string[] {
  const t = new Date(createdAt).getTime();
  return others.filter((o) => new Date(o.last_read_at).getTime() >= t).map((o) => o.user_id);
}
