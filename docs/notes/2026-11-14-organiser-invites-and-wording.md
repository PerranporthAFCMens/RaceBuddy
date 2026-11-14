# 2026-11-14: Organisers join by invite; one set of words

Step 5 of the app structure plan (thread "Rethink how YGIG fits together").

## Invites (Adam: organisers can't make accounts themselves)
- Admin console > Organisers > an organiser > "Send invite" with an email.
  `sendOrganiserInvite` (`src/lib/invite/send.ts`, server only, service role):
  1. `auth.admin.generateLink` type `invite` (makes an account with no
     password), or `magiclink` if the email already has an account;
  2. adds them as an owner (`admin_add_owner`, as the admin);
  3. emails a branded link via Resend: `/auth/confirm?token_hash=…&type=…`
     to `/organiser/welcome` (new: set a password, 18+ and terms tick) or
     `/organiser` (existing account).
  Nothing is emailed if adding the owner fails. Links expire after the
  Supabase email link lifetime; the email says to use "Email me a sign-in
  link" on /login if so.
- Sign-in page: the organiser door (`?door=organiser`) has no "Join" tab, and
  sign-up there no longer skips the racer profile (new accounts made at /login
  are racers).
- Email copy: `src/lib/invite/email.ts` (tested in `email.test.ts`), reusing the
  report email frame.

## Words
- "Racer" instead of "athlete" on app and console screens, the not-found page
  and the report emails; "Organiser view" instead of "Event console".
- Not changed: Terms of Use and Privacy notice text (approved legal wording;
  changing it would need a new terms version), code names, and test names.

No database change.
