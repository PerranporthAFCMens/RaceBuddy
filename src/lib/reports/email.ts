// Builds the "new report" emails. Pure, so it can be tested without sending.
// Kept plain on purpose (short text, one link, no images or tracking) so mail
// providers treat it as a normal notice, not marketing.

import { brand } from "../../design/brand.ts";
import { colors as c } from "../../design/tokens.ts";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function wrap(title: string, lines: string[], link?: { href: string; label: string }) {
  return `<!doctype html><html><body style="margin:0;background:${c.bg}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bg};padding:20px 0"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${c.bg};padding:24px">
    <tr><td><p style="margin:0;font:700 13px Arial,sans-serif;letter-spacing:4px;color:${c.fg}">${esc(brand.wordmark.lead)}<span style="color:${c.accent}">${esc(brand.wordmark.accent)}</span></p>
    <h1 style="margin:16px 0 12px;font:700 22px Arial,sans-serif;text-transform:uppercase;color:${c.fg}">${esc(title)}</h1>
    ${lines.map((l) => `<p style="margin:0 0 8px;font:15px Arial,sans-serif;color:${c.fg}">${esc(l)}</p>`).join("")}
    ${
      link
        ? `<p style="margin:16px 0 0"><a href="${esc(link.href)}" style="display:inline-block;background:${c.accent};color:${c["accent-ink"]};font:700 13px Arial,sans-serif;text-transform:uppercase;letter-spacing:1px;text-decoration:none;padding:10px 16px">${esc(link.label)}</a></p>`
        : ""
    }
    </td></tr>
  </table></td></tr></table></body></html>`;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" });

/** To the site admin: what kind of report, how urgent, and a link to it. */
export function buildAdminReportEmail(r: {
  site: string;
  reportId: string;
  category: string;
  priority: "urgent" | "high" | "normal";
  reportedName: string | null;
  eventNames: string[];
  createdAt: string;
}) {
  const href = `${r.site}/admin/reports/${r.reportId}`;
  const level = r.priority === "urgent" ? "Urgent report" : r.priority === "high" ? "High priority report" : "New report";
  const subject = `${level} on ${brand.name}: ${r.category}`;
  const lines = [
    `Type: ${r.category}`,
    `Priority: ${r.priority}`,
    `About: ${r.reportedName ?? "an athlete"}`,
    ...(r.eventNames.length ? [`Listed on: ${r.eventNames.join(", ")}`] : []),
    `Made: ${when(r.createdAt)}`,
  ];
  const text = [`${level} to review on ${brand.name}.`, "", ...lines, "", `Review it: ${href}`].join("\n");
  return { subject, text, html: wrap(level, lines, { href, label: "Review the report" }) };
}

/** To an event's organisers: only that a report exists and is being reviewed. No names or messages. */
export function buildOrganiserReportEmail(r: { site: string; eventName: string; createdAt: string }) {
  const subject = `A report on ${r.eventName} is being reviewed`;
  const lines = [
    `A report has been made about an athlete listed on ${r.eventName} (${when(r.createdAt)}).`,
    `The ${brand.name} team is reviewing it. You don't need to do anything, and we'll be in touch if we need your help.`,
  ];
  const text = [...lines, "", `${brand.name} event console: ${r.site}/organiser`].join("\n");
  return { subject, text, html: wrap("Report being reviewed", lines, { href: `${r.site}/organiser`, label: "Event console" }) };
}
