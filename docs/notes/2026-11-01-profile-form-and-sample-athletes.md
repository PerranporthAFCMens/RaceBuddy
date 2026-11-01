# 2026-11-01: profile form fixes and sample athletes

- Profile form on iPhone: the date of birth box no longer spills past the edge
  (Safari's native date width), and boxes in each pair line up even when one
  label wraps to two lines.
- 5km time is now two boxes (min, sec) and previous race time three boxes
  (hrs, min, sec), so the phone number pad is enough. New `TimeInput`
  component, shown on `/styleguide`. Previous race time is still saved as text,
  now always as `h:mm:ss`; older free-text times ("Cornwall 1:21:12", "1:23")
  are read back into the boxes.
- `supabase/samples/athletes.json` + `npm run samples:add` / `samples:remove`:
  30 made-up athletes with Test Race listings, for seeing browse and matches on
  the dev site. First written as SQL, but the Supabase SQL editor can't create
  accounts ("must be owner of table users"), so it uses the admin API like
  `test:live`. 12 have a spare spot, 10 need one, 8 are singles. They can't
  sign in and get no match emails.
- Later the same day Adam tried four time-entry designs and picked scroll
  wheels: `TimeInput` now uses native selects (the iPhone shows its own wheel
  picker). 5km minutes run 10–60; race time hours 0–5. Form field names and
  what is saved are unchanged.
- Then: newer iPhones show `<select>` as a pop-up list, not a wheel, so
  `TimeInput` is now our own wheel picker (tap the time, a sheet slides up with
  scroll-snap wheels, Done). Wheels are spinbuttons for screen readers and work
  with the arrow keys. Still posts the same `_h` / `_m` / `_s` fields.
