# 2026-11-14: Shared header, account menu and "Wrong account" page

Step 1 of the app structure plan (thread "Rethink how YGIG fits together"):
one product with three areas (admin console, organiser view, racer app).

- One header on every signed-in screen (`SiteHeader`): logo goes to the start
  of the area you're in (not always Browse), an area tag ("Admin",
  "Organiser"), and an account menu (`AccountMenu`) with "Signed in as",
  the areas this account can switch to, Safety tips and Sign out.
- `src/lib/roles.ts`: `getRoles()` (admin, organiser, racer profile) and
  `homeFor()` / `areasFor()`.
- Opening `/admin` or `/organiser` with an account that can't use it now goes
  to `/wrong-account`, which says who you're signed in as and offers "Sign in
  with another account". It used to show the racer "page isn't here" Oops.
  Bad ids inside a console still give "not found".
- Sign out accepts an optional `next` (a page on this site only, `safeNext`).
- The "Admin console" and "Event console" buttons on My profile are gone; the
  account menu replaces them. "Event console" is now called "Organiser view".
- Styleguide: new "Account menu" section (deliberate screenshot change).

No database change.
