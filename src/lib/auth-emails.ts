// Branded sign-up and sign-in emails. Supabase sends these, not the app, so
// they are pasted into Supabase (Authentication > Emails). This file builds
// them from the brand name and colours; `npm run auth-emails` writes them to
// supabase/templates/, and a test fails if those files are out of date.
//
// {{ .ConfirmationURL }} is filled in by Supabase. It works with the app's
// /auth/confirm route, which accepts both link styles.

import { brand } from "../design/brand.ts";
import { colors as c } from "../design/tokens.ts";

export type AuthEmail = {
  /** File name in supabase/templates/ (without .html). */
  file: string;
  /** The template's name in Supabase's Emails screen. */
  supabaseName: string;
  subject: string;
  html: string;
};

const font = "Arial,Helvetica,sans-serif";

function layout({ heading, intro, button, after }: { heading: string; intro: string; button: string; after: string }) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${heading}</title></head>
<body style="margin:0;padding:0;background:${c.bg}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bg}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">
<tr><td style="padding-bottom:28px;border-bottom:2px solid ${c.accent}">
<p style="margin:0;font:900 22px ${font};letter-spacing:4px;color:${c.fg}">${brand.wordmark.lead}<span style="color:${c.accent}">${brand.wordmark.accent}</span></p>
<p style="margin:6px 0 0;font:11px ${font};letter-spacing:3px;text-transform:uppercase;color:${c.muted}">${brand.tagline}</p>
</td></tr>
<tr><td style="padding:28px 0 0">
<h1 style="margin:0 0 12px;font:700 24px ${font};text-transform:uppercase;color:${c.fg}">${heading}</h1>
<p style="margin:0 0 24px;font:15px/1.5 ${font};color:${c.fg}">${intro}</p>
<a href="{{ .ConfirmationURL }}" style="display:inline-block;background:${c.accent};color:${c["accent-ink"]};font:700 14px ${font};text-transform:uppercase;letter-spacing:1px;text-decoration:none;padding:14px 22px">${button}</a>
<p style="margin:24px 0 0;font:13px/1.5 ${font};color:${c.muted}">${after}</p>
<p style="margin:16px 0 0;font:12px/1.5 ${font};color:${c.muted};word-break:break-all">Button not working? Copy this link into your browser:<br><a href="{{ .ConfirmationURL }}" style="color:${c.muted}">{{ .ConfirmationURL }}</a></p>
</td></tr>
<tr><td style="padding-top:32px">
<p style="margin:0;padding-top:16px;border-top:1px solid ${c.edge};font:12px/1.5 ${font};color:${c.muted}">${brand.name} is for adults aged 18 and over. You're getting this email because someone used this address on ${brand.name}.</p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>
`;
}

export function authEmails(): AuthEmail[] {
  const n = brand.name;
  return [
    {
      file: "confirm-signup",
      supabaseName: "Confirm sign up",
      subject: `Confirm your ${n} account`,
      html: layout({
        heading: "Confirm your email",
        intro: `Welcome to ${n}. Tap the button to confirm your email and finish setting up your account.`,
        button: "Confirm my email",
        after: "If you didn't sign up, ignore this email and no account will be made.",
      }),
    },
    {
      file: "magic-link",
      supabaseName: "Magic link",
      subject: `Your ${n} sign-in link`,
      html: layout({
        heading: "Sign in",
        intro: `Tap the button to sign in to ${n}. The link works once and expires soon.`,
        button: "Sign me in",
        after: "If you didn't ask for this, ignore this email. Your account is safe.",
      }),
    },
    {
      file: "reset-password",
      supabaseName: "Reset password",
      subject: `Reset your ${n} password`,
      html: layout({
        heading: "Reset your password",
        intro: "Tap the button to choose a new password. The link works once and expires soon.",
        button: "Choose a new password",
        after: "If you didn't ask for this, ignore this email. Your password stays the same.",
      }),
    },
    {
      file: "change-email",
      supabaseName: "Change email address",
      subject: `Confirm your new ${n} email`,
      html: layout({
        heading: "Confirm your new email",
        intro: `Tap the button to use this address for your ${n} account.`,
        button: "Confirm new email",
        after: `If you didn't ask for this, ignore this email and contact us. Your account keeps its old address.`,
      }),
    },
  ];
}
