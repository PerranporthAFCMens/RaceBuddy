# 2026-11-01: app name and web address in one place

- The product name is now one line in `src/design/brand.ts`. The wordmark and home-screen label follow it. All hard-coded "Race Buddy" text in `src/` (error messages, empty states, privacy page, alert emails, email sender name) now reads from it.
- New test `src/design/brand.test.ts` fails if the name is typed anywhere else in `src/`.
- The site address comes from one helper, `siteUrl()` in `src/lib/site-env.ts` (reads `NEXT_PUBLIC_SITE_URL`). Sign-up links, alert emails and page metadata (`metadataBase`) use it.
- `EMAIL_FROM` is now just the sender address; the display name comes from `brand.ts`. The old `Name <address>` style still works (the name part is ignored).
- Steps for a rename or custom domain: `docs/rename-and-domain.md`.
