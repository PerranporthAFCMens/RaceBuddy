# 2026-11-12: Safety database (part 1 of 4)

Adam approved the safety audit (Claude Doc "YGIG safety, age and data
protection audit") with the recommended decisions. This part is database
only; the screens come in parts 2 and 3, so nothing changes on screen yet.

Migration `20261112120000_safety.sql` (rollback in `supabase/rollback/`):
- `admins`: added by hand in the SQL editor. `is_admin()` for row rules.
- `account_status` (active, warned, suspended, banned) with a message the
  person can see. Suspended or banned people can't save their profile, list,
  request, chat, react or lock in (triggers), and are hidden from browsing
  like a block. Reading, deleting a listing and deleting the account work.
- `banned_emails`: sha256 of the email only; a banned email can't make a new
  profile.
- Date of birth can't be changed once saved (same value is fine). Admins and
  the SQL editor can.
- `profiles.terms_version` / `terms_accepted_at` (time set by the server).
- Reports: category, optional `message_id`, priority set by the database
  (threat and suspected under-18 = urgent, harassment = high), kept when
  either person deletes their account (`on delete set null`, plus the
  reported email's hash so they can still be banned). People can only report
  a chat they are in, about someone in it.
- `report_evidence`: copy of the reported message and up to 5 before it (or
  the last 6 for a chat report). No direct access; admins read it through
  `admin_report_evidence(report, reason)`, which needs a reason and writes to
  `evidence_access_log`.
- `moderate(action, report, user, note, message)`: review, dismiss, resolve,
  warn, suspend, ban, reinstate, note. Suspend/ban also pauses listings and
  withdraws pending requests. Every call is logged in `moderation_actions`.
  Admins can't moderate other admins.

Works with main's code: old chat reports get category "other"; the profile
form sends the same date of birth so it still saves.

Not done here: report retention clean-up (12 months after closing) comes with
the admin screen; the "typing" channel is still open.
