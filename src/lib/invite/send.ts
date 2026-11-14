import "server-only";
import { emailFrom } from "@/lib/alerts/send";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildOrganiserInviteEmail } from "./email";

type Result = { ok: true; isNew: boolean } | { ok: false; error: string };

/**
 * Makes sure `email` has an account (creating one with no password if not),
 * and emails them a one-time sign-in link to the organiser view. New accounts
 * land on /organiser/welcome to set a password. Call only after checking the
 * caller is the site admin. `addOwner` runs once the account exists and
 * before the email goes; if it returns an error, nothing is sent.
 */
export async function sendOrganiserInvite(r: {
  email: string;
  organiserName: string;
  site: string;
  addOwner: () => Promise<string | null>;
}): Promise<Result> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "Emails aren't switched on yet, so the invite can't be sent." };
  const db = createAdminClient();

  let isNew = true;
  let gen = await db.auth.admin.generateLink({ type: "invite", email: r.email });
  if (gen.error) {
    // Already has an account: send a plain sign-in link instead.
    isNew = false;
    gen = await db.auth.admin.generateLink({ type: "magiclink", email: r.email });
  }
  const token = gen.data?.properties?.hashed_token;
  if (gen.error || !token) return { ok: false, error: "Couldn't create a sign-in link for that email. Check it and try again." };

  const addError = await r.addOwner();
  if (addError) return { ok: false, error: addError };

  const next = isNew ? "/organiser/welcome" : "/organiser";
  const link = `${r.site}/auth/confirm?token_hash=${encodeURIComponent(token)}&type=${isNew ? "invite" : "magiclink"}&next=${encodeURIComponent(next)}`;
  const email = buildOrganiserInviteEmail({ site: r.site, organiserName: r.organiserName, link, isNew });
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: emailFrom(), to: [r.email], subject: email.subject, text: email.text, html: email.html }),
  });
  if (!res.ok) {
    console.error("Invite email failed", res.status, await res.text().catch(() => ""));
    return { ok: false, error: "The invite email didn't send. Try again in a minute." };
  }
  return { ok: true, isNew };
}
