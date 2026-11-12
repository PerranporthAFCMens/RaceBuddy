# User agreement rewritten (Terms of Use v2026-11-12)

Adam asked for the Terms to be stripped back and as protective of him as
possible. Main changes from the first version (PR #30):

- Says plainly the service only makes introductions: no tickets, name
  changes or money. Deals are between athletes and the organiser.
- New: "We don't check people" (and what "Verified ticket" does and does not
  mean), "Your own risk", "What you post" (licence to show and keep safety
  copies), "The service" (free, as is, can change or stop), "Our liability"
  (exclusions, cap of LIABILITY_CAP_GBP = £50, the legal carve-outs),
  "If you break these terms", "Ending", and the small print (whole
  agreement, transfer, severance, England and Wales law).
- Removed promises that could be held against the owner: the 5 working day
  reply time, "every decision is recorded with a reason", automatic
  suspend-then-close for suspected under-18s, and "we will tell the police".
  Moderation is now at our discretion, with or without notice.
- Future-proofed for per-event organiser moderators: organisers can't read
  chats; appointed organiser moderators see reported messages only.
- `OPERATOR` in `src/lib/legal.ts` names who runs the service once Adam
  decides (null = product name only).

TERMS_VERSION moved to 2026-11-12, so everyone is asked to agree again.
Until dev is released, someone using both sites is asked on each (they share
one database and the live site still expects 2026-11).
