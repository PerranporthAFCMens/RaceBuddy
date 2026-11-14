# 2026-11-14: Owner console, part 1 (database + admin console)

Adam asked for two levels: his site admin level (oversee everything, add
events and owners, make changes) and event owners who run their own events.
Moderation stays with the site admin (see 2026-11-12-who-moderates.md).

- Migration `20261114120000_owner_console.sql` (one file for all three PRs):
  `organiser_owners`, `event_hidden_members`, `console_log`; admin functions
  (overview, people search, organisers, owners, events, categories, log);
  owner functions (my organisers, events, numbers, members, swaps, hide and
  restore, event details, theme). Hidden members drop out of browse, matches,
  alerts and requests at that event (`feed_entries`, `entry_fits`,
  `send_partner_request` replaced with the same columns and arguments).
- Admin screens moved into a wider `(console)` layout, same addresses:
  `/admin` is now an Overview with tabs for Reports (the old moderation list),
  People (search by name or email, filter by account status, warn, suspend,
  ban or reinstate without a report) and Log (every console change).
- "Moderation" button on My profile is now "Admin console".
- Styleguide: Consoles section (tabs and number tiles).

Next: part 2 (Organisers, owners and Events screens), part 3 (/organiser for
event owners, plus a Privacy line saying owners see the members list).
