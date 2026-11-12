# Sign-up and sign-in emails

Built by `npm run auth-emails` from `src/lib/auth-emails.ts`. Do not edit these files by hand.

Supabase sends these. To update them: Supabase > Authentication > Emails > Templates. For each row,
open the template, paste the subject, switch the body to source/HTML, paste the whole file, and save.

| Supabase template | Subject | File |
| --- | --- | --- |
| Confirm sign up | Confirm your YGIG account | `confirm-signup.html` |
| Magic link | Your YGIG sign-in link | `magic-link.html` |
| Reset password | Reset your YGIG password | `reset-password.html` |
| Change email address | Confirm your new YGIG email | `change-email.html` |
