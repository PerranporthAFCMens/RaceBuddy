# 2026-11-12: Branded sign-up and sign-in emails

Supabase sends the sign-up, sign-in link, password reset and change-email
emails, so they had Supabase's plain default look. `src/lib/auth-emails.ts`
now builds YGIG versions (black and gold, name from `brand.ts`, colours from
tokens) and `npm run auth-emails` writes them to `supabase/templates/`.
`npm run verify` fails if those files are out of date.

They only take effect once pasted into Supabase (Authentication > Emails), see
`supabase/templates/README.md`. Supabase's built-in sender only reaches the
project team and is heavily rate limited, so real users need custom SMTP:
Adam's StackMail mailbox hello@ygig.co.uk (smtp.stackmail.com, port 465).
No code path or database change.
