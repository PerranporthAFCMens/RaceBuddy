# 2026-11-12: Moderation screen (safety part 3)

- `/admin` (admins only; others get "not found"): reports, most urgent first,
  with Open / Under 18? / Closed filters and an urgent banner. A Moderation
  button shows on My profile for admins.
- `/admin/reports/[id]`: the report, the reported person (name, age, date of
  birth, joined, status, report and block counts), message evidence behind a
  "why do you need to see them?" box (logged), a decision form (review,
  dismiss, resolve, warn, suspend, ban, reinstate, note; a note is required)
  and the decision log for that report and person.
- Migration `20261112140000_admin_screens.sql`: `admin_reports(filter)`,
  `admin_person(user)` (both admin-only) and `purge_closed_reports()`
  (server only). The daily cron now also deletes reports closed more than 12
  months ago, with their evidence. It only runs once CRON_SECRET is set in
  Vercel.
- Styleguide: report row example.

Not done: email alert to the admin on urgent reports (needs Resend switched
on); for now, check /admin daily.
