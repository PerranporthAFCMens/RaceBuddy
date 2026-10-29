// Builds the "new match" email. Pure, so it can be tested without sending.

import { colors as c } from "../../design/tokens.ts";

export type AlertMatch = {
  entryId: string;
  firstName: string;
  age: number | null;
  what: string;
  details: string;
  note: string | null;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildAlertEmail({
  site,
  eventName,
  eventSlug,
  matches,
}: {
  site: string;
  eventName: string;
  eventSlug: string;
  matches: AlertMatch[];
}) {
  const shown = matches.slice(0, 3);
  const more = matches.length - shown.length;
  const lead = shown[0]!;
  const subject =
    matches.length === 1
      ? `New match for ${eventName}: ${lead.firstName} ${lead.what.toLowerCase()}`
      : `${matches.length} new matches for ${eventName}`;
  const settings = `${site}/me/race?event=${encodeURIComponent(eventSlug)}#alerts`;
  const forYou = `${site}/browse?event=${encodeURIComponent(eventSlug)}`;

  const text = [
    matches.length === 1 ? `${lead.firstName} could be your partner for ${eventName}.` : `New people who fit what you're looking for at ${eventName}:`,
    "",
    ...shown.flatMap((m) => [
      `${m.firstName}${m.age ? `, ${m.age}` : ""}: ${m.what}`,
      m.details,
      ...(m.note ? [`"${m.note}"`] : []),
      `${site}/athletes/${m.entryId}`,
      "",
    ]),
    ...(more > 0 ? [`And ${more} more: ${forYou}`, ""] : []),
    `You're getting this because you turned on match alerts for ${eventName} on Race Buddy.`,
    `Turn them off: ${settings}`,
  ].join("\n");

  const card = (m: AlertMatch) => `
    <tr><td style="padding:16px 0;border-top:1px solid ${c.edge}">
      <p style="margin:0;font:700 15px Arial,sans-serif;text-transform:uppercase;color:${c.fg}">${esc(m.firstName)}${m.age ? `, ${m.age}` : ""}</p>
      <p style="margin:4px 0 0;font:14px Arial,sans-serif;color:${c.accent}">${esc(m.what)}</p>
      <p style="margin:4px 0 0;font:14px Arial,sans-serif;color:${c.muted}">${esc(m.details)}</p>
      ${m.note ? `<p style="margin:8px 0 0;padding-left:10px;border-left:2px solid ${c.accent};font:14px Arial,sans-serif;color:${c.fg}">${esc(m.note)}</p>` : ""}
      <p style="margin:12px 0 0"><a href="${esc(`${site}/athletes/${m.entryId}`)}" style="display:inline-block;background:${c.accent};color:${c["accent-ink"]};font:700 13px Arial,sans-serif;text-transform:uppercase;letter-spacing:1px;text-decoration:none;padding:10px 16px">See ${esc(m.firstName)}</a></p>
    </td></tr>`;

  const html = `<!doctype html><html><body style="margin:0;background:${c.bg}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bg};padding:20px 0"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${c.bg};padding:24px">
    <tr><td><p style="margin:0;font:700 13px Arial,sans-serif;letter-spacing:4px;color:${c.fg}">RACE BUDD<span style="color:${c.accent}">Y</span></p>
    <h1 style="margin:16px 0 8px;font:700 24px Arial,sans-serif;text-transform:uppercase;color:${c.fg}">${
      matches.length === 1 ? `${esc(lead.firstName)} could be your partner` : `${matches.length} new matches`
    }</h1>
    <p style="margin:0 0 8px;font:14px Arial,sans-serif;color:${c.muted}">${esc(eventName)}</p></td></tr>
    ${shown.map(card).join("")}
    ${more > 0 ? `<tr><td style="padding:12px 0;border-top:1px solid ${c.edge}"><a href="${esc(forYou)}" style="font:14px Arial,sans-serif;color:${c.accent}">And ${more} more</a></td></tr>` : ""}
  </table>
  <p style="max-width:520px;margin:12px auto 0;font:12px Arial,sans-serif;color:${c.muted};padding:0 12px">You're getting this because you turned on match alerts for ${esc(eventName)} on Race Buddy. <a href="${esc(settings)}" style="color:${c.muted}">Turn alerts off</a>.</p>
  </td></tr></table></body></html>`;

  return { subject, text, html, settingsUrl: settings };
}
