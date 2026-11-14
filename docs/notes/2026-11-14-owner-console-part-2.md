# 2026-11-14: Owner console, part 2 (organisers, owners, events)

Site admin screens, using the functions from part 1's migration (no new SQL):

- `/admin/organisers`: every organiser with its owners and number of events;
  add an organiser.
- `/admin/organisers/[id]`: owners (add by the email they signed up with,
  remove), its events, colour theme picker (replaces setting it by SQL) and
  details.
- `/admin/events`: every event (shown, hidden or test) with listings and
  categories; `/admin/events/new` and `/admin/events/[id]`: organiser, name,
  short name, venue, dates, ticket link, name-change cutoff, "show to
  athletes", and categories (add, or remove if no athlete uses it).
- Shared console pieces: `StateForm`, `ThemeChoices`, `OrganiserFields`,
  `EventFields`, `src/lib/console.ts` (with tests).
