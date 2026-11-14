# 2026-11-14: Owner console, part 3 (event owners)

`/organiser` for event owners (people the site admin added as owners of an
organiser; site admins can open it too). No new SQL: uses part 1's functions.

- Home: each organiser they run, its events with numbers, and the colour
  theme picker.
- Per event (`/organiser/events/[id]`): Overview (number tiles), Members
  (search by first name, filters, take a member off this event with an
  optional reason, put them back), Swaps (confirmed lock-ins with the full
  names athletes agreed to share) and Settings (name, venue, dates, ticket
  link, name-change cutoff). Adding events, categories and showing or hiding
  an event stay with the site admin.
- "Event console" button on My profile for owners.
- Privacy notice: says the organiser sees a listing as other athletes do and
  can take it off their race (Adam chose the members list on 2026-11-14).

## Organiser sign-in, no racer profile (Adam, 2026-11-14)

- Event owners and the site admin don't need a racer profile. The consoles and
  their actions check `requireUser()` plus the role, not `requireProfile()`.
- Separate organiser door at `/login/organiser` (Adam picked this over fully
  separate staff accounts). Same accounts; a new account made there goes
  straight to `/organiser`, not profile set-up. Signed-out visits to
  `/organiser` or `/admin` are sent to this door. `/login` links to it.
- Someone who signs in there but runs no events sees a short "No events yet"
  note with the contact email, instead of "not found".
- The console header shows Sign out (not "Back to the app") when there is no
  racer profile.
- Moderation (reports, chat evidence, warnings, suspensions, bans) stays in
  the Admin console only. Owners can only take a listing off their own race.
- New brand screenshot: `organiser-sign-in`. Changed: `sign-in` and `join`
  (new "Organiser sign in" link). Both refreshed from the CI brand-report.
