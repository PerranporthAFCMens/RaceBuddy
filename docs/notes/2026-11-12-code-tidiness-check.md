# Code tidiness check

A read-only review on 2026-11-12 found the code in good shape: `npm run verify`
passes (57 unit tests), `npm audit` finds 0 vulnerabilities, there are no unused
files, and only one 9-line repeat (the URL parsing in `results-link.ts` and
`strava.ts`), which is too small to be worth sharing.

The unused-export tool (knip) flagged some items, but they were false alarms:
`@tailwindcss/turbopack` is loaded by name in `next.config.ts`, and the flagged
helpers are used inside their own files. Nothing was removed. The only change
was bringing `STATUS.md` up to date.

`npm run test:live` failed one check on its first run and passed 67/67 when run
again straight after, so one check may be timing-sensitive.
