# 2026-11-14: Organiser view leads with "teams at risk"

Step 3 of the app structure plan (thread "Rethink how YGIG fits together").

- Team at risk = a listing with situation `spare_spot` (ticket holder whose
  partner or teammate dropped out), status `looking`, not taken off the event.
  `isAtRisk()` in `src/lib/owner.ts`, worked out from `owner_members`, so no
  database change.
- Event overview: one gold headline (`HeadlineTile`) for teams at risk, then
  Swaps done, No ticket looking, Racers signed up. The other numbers sit under
  "More numbers".
- The Members tab is now "Racers" and opens on "At risk" ("Everyone" is
  `?status=all`). At-risk racers show a "Partner missing" flag.
- Adam (2026-11-14): taking a racer off an event is the organiser's decision
  only. The site admin no longer sees Take off / Put back, and the two actions
  refuse an admin. The database function still allows admins; tightening that
  needs a migration (not done here).
- Styleguide: `HeadlineTile` added to Consoles (deliberate screenshot change).
