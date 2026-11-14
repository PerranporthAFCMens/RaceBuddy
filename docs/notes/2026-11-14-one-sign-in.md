# 2026-11-14: One sign-in page for every role

Step 2 of the app structure plan (thread "Rethink how YGIG fits together").

- `/login` is the only sign-in page. With no `next`, signing in (password,
  email link or confirmation link) goes to `/start`, which sends each person
  home: admin -> `/admin`, organiser -> `/organiser`, racer -> `/browse`
  (new racers are then sent on to build a profile, as before).
- `/login/organiser` now just redirects to `/login?door=organiser`, so old
  links keep working. `door=organiser` (also used when a signed-out visitor
  opens a console) changes the wording and makes "Join" skip the racer
  profile. Organiser invites by email come in step 5.
- Signed-in visitors to the home page go to `/start` instead of always Browse.
- Sign-in wording no longer names KeltX.
- Brand test: the `organiser-sign-in` screen is now `/login?door=organiser`;
  its screenshot and `sign-in` change (wording). Refreshed from CI.

No database change.
