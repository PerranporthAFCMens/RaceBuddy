# Fix whole-chat reports; live check covers safety

- Bug: reporting a whole chat (not a single message) failed with
  `null value in column "is_reported"` whenever the chat had messages, because
  `m.id = new.message_id` is null when no message is chosen. Fixed in
  `20261112160000_fix_chat_report_evidence.sql` with `coalesce(..., false)`.
  New database test reproduces it (failed before the fix, passes after).
- `npm run test:live` now also checks: unblock, date of birth lock, reporting
  a single message (priority, evidence), people can't read evidence or
  moderate, a throwaway admin opening evidence (reason needed, logged),
  suspend (can't message, hidden, can still read), reinstate, close.
- Clean-up now deletes this run's reports and moderation records too, because
  reports are kept when accounts are deleted.
