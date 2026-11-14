// Builds the organiser invite emails. Pure, so it can be tested without sending.

import { brand } from "../../design/brand.ts";
import { wrap } from "../reports/email.ts";

/**
 * To someone the site admin has added as an organiser. `isNew`: they have no
 * account yet, so the link signs them in and asks them to set a password.
 */
export function buildOrganiserInviteEmail(r: { site: string; organiserName: string; link: string; isNew: boolean }) {
  const subject = `You've been added to ${r.organiserName} on ${brand.name}`;
  const lines = [
    `${brand.name} has added you to ${r.organiserName}.`,
    `In the organiser view you can see who's signed up to your events and how many teams are at risk of losing a partner. You never see racers' chats or contact details.`,
    r.isNew
      ? "Tap the button to sign in and set your password. The link works once and expires after a short while."
      : "Tap the button to sign in. The link works once and expires after a short while.",
    `If it has expired, go to ${r.site}/login and choose "Email me a sign-in link".`,
  ];
  const label = r.isNew ? "Set your password" : "Open the organiser view";
  const text = [...lines, "", `${label}: ${r.link}`].join("\n");
  return { subject, text, html: wrap("You're invited", lines, { href: r.link, label }) };
}
