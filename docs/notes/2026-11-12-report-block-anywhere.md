# 2026-11-12: Report and block from anywhere (safety part 2a)

Uses the safety database from part 1.

- Report form (`src/components/ReportForm.tsx`, actions in
  `src/app/(app)/safety/actions.ts`): pick what's wrong (threats, harassment,
  might be under 18, inappropriate profile, spam or scam, impersonation,
  other), optional details, "If you're in danger, call 999". Confirmation
  says the person isn't told who reported them.
- Where: athlete profile ("Block or report"), the chat's "Block or report",
  and each message (tap a message, then Report; others' messages only).
  Requests link to the athlete profile, so they're covered too.
- Blocked athletes list with Unblock on My profile (new `my_blocks()`
  function, first names only, only your own list).
- Date of birth is read-only once saved, with a "contact us" note.
- Warned, suspended or banned people see a notice at the top of every
  signed-in screen. Suspended errors get plain wording.
- Styleguide: new Safety section (report form, suspended notice) and the
  Report option in the message menu.

Migration `20261112130000_my_blocks.sql` only adds a function. Until it is
run, the Blocked athletes list just doesn't show.

Next (part 2b): Terms of Use page and acceptance, safety tips page, privacy
notice update, contact address.
