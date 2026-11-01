# 2026-11-01: profile form fixes and sample athletes

- Profile form on iPhone: the date of birth box no longer spills past the edge
  (Safari's native date width), and boxes in each pair line up even when one
  label wraps to two lines.
- 5km time is now two boxes (min, sec) and previous race time three boxes
  (hrs, min, sec), so the phone number pad is enough. New `TimeInput`
  component, shown on `/styleguide`. Previous race time is still saved as text,
  now always as `h:mm:ss`; older free-text times ("Cornwall 1:21:12", "1:23")
  are read back into the boxes.
- `supabase/samples/`: 30 made-up athletes with Test Race listings, for seeing
  browse and matches on the dev site. Not a migration; Adam runs it by hand and
  removes it with `sample-athletes-remove.sql`. Checked on the local test
  database: 30 listings (12 with a spare spot, 10 needing one, 8 singles), safe
  to run twice, no match emails queued, removal leaves nothing behind.
