# 2026-11-01: app security fixes

- Sign-in redirect: `next=/\evil.com` (and similar) used to send people to another site after a sign-in link, because browsers read `\` as `/`. One shared `safeNext()` in `src/lib/safe-next.ts` now guards both the login actions and `/auth/confirm`, with unit tests.
- Browser security headers on every page (`next.config.ts`): Content-Security-Policy (this site and Supabase only, no frames, no plugins), HSTS, nosniff, X-Frame-Options, Referrer-Policy, COOP, Permissions-Policy; `X-Powered-By` removed. `e2e/security.spec.ts` checks them and that pages load with nothing blocked.
- Alerts job `/api/cron/alerts`: on Vercel it now refuses to run until `CRON_SECRET` is set (it used to run for anyone when unset), and compares the secret in constant time.
- Not changed: the CSP still allows inline scripts (Next.js needs them unless every page renders per request with a nonce). Next step if wanted.
- Locally the 5 brand screenshot tests differ on this sandbox's Chromium on unchanged `dev` too; CI is the reference.
