# 2026-11-14: Admin console opens on "Today"

Step 4 of the app structure plan (thread "Rethink how YGIG fits together").

- `/admin` is now "Today": the urgent-reports banner first, then a To do list
  (open reports; upcoming events with no categories; upcoming events still
  hidden; organisers with no owner), then three numbers (Racers, Live events,
  Organisers). The other numbers sit under "More numbers".
- Tabs are grouped by the admin's two jobs: Today · Safety (Reports, People) ·
  Setup (Organisers, Events) · Records (Log). `ConsoleNav` items take an
  optional `group`.
- Built from existing functions (`admin_overview`, `admin_events`,
  `admin_organisers`); no database change.
- Styleguide: the console tabs example shows a group (deliberate screenshot
  change).
