# 2026-11-12: Rename to YGIG

- `src/design/brand.ts`: name is now "YGIG". Every page, page title, the
  home-screen label, the logo (YGI + gold G) and alert emails follow it.
- App icon (`src/app/icon.svg`, `public/icon.svg`): letters "RB" -> "YG".
- Approved brand screenshots refreshed (deliberate design change: logo text).

Not changed: Vercel project names, `package.json` name, the test organiser
slug and doc titles (nobody sees them). The site address is a setting, not
code: moving to https://www.ygig.co.uk follows `docs/rename-and-domain.md`
(GoDaddy DNS, Vercel domain, `NEXT_PUBLIC_SITE_URL`, Supabase redirect URLs,
Resend domain). No database change.
