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
