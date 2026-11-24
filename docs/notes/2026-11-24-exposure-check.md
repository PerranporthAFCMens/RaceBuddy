# Exposure check (2026-11-24)

Adam asked whether the Supabase secret key could be found with Chrome developer
tools, and whether developer tools could be used to read tables.

## What was checked

- Live (www.ygig.co.uk) and dev sites, signed out and signed in: every script
  and page the browser downloaded (about 29 MB per site). The secret key,
  Ticket Tailor key, Resend key and cron secret are not there. Only the
  publishable key is, which is normal and safe (it is designed to be public;
  the row rules decide what it can do). Requests to Supabase carry only it.
- A fresh production build: nothing secret in `.next/static`.
- `scripts/exposure-check.mts` (new, `npm run test:exposure`): uses only the
  publishable key, as a signed-out visitor and as an ordinary signed-in
  athlete, against the real database. Tries to read, add, change and delete in
  all 27 tables and views, call all 47 functions, change or delete another
  athlete's profile and listing, make itself admin, list photos and buckets,
  and list user accounts. 284 checks, all pass. Writes use filters that can
  never match, so even a wrongly allowed write changes nothing; throwaway users
  are deleted after.
- `npm run test:live`: 72 passed, 0 failed.

## Not changed

- Supabase security advisors: the Supabase connector can't see the Race Buddy
  organisation, so they weren't run. Adam can see them in the dashboard under
  Advisors > Security Advisor.
- `npm audit`: next 16.4.3 has moderate advisories fixed in 16.4.6. Most need
  features this app doesn't use (`use cache`, Edge routes, self-hosting).
  Worth a small upgrade PR on its own.
