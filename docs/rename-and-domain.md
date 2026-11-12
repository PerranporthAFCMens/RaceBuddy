# Renaming the app and moving to your own web address

## Rename the app (one line)

1. In `src/design/brand.ts`, change `const name = "Race Buddy";` to the new name.
2. Open a PR into `dev`. That one line changes every page, page title, the home-screen label, the logo text and the match-alert emails.

The `brand` check then fails on its screenshot test, because the logo text changed. That is expected: refresh the approved screenshots in the same PR (`npm run test:brand:update`) and name it in the PR.

Not covered by the one line (do these when the new name is final):

- **App icon**: the PNG files `src/app/icon.png`, `src/app/apple-icon.png` and `public/icons/*.png` show the letters "YG / IG". A new name needs new icon images (see `docs/notes/2026-11-12-home-screen-icon.md`).
- **Logo colour split**: the last letter is gold by default. To pick a different split, set `wordmark` by hand in `brand.ts`.
- Optional, nobody sees these: `package.json` name, Vercel project names (`race-buddy`, `race-buddy-dev`), the test organiser slug `race-buddy-test`, and the doc titles.

A test (`src/design/brand.test.ts`) fails if anyone types the name anywhere else in `src/`, so it stays a one-line change.

## Move the live site to your own domain

The site address is one setting per site: `NEXT_PUBLIC_SITE_URL`. Nothing in the code needs to change. Example below uses `newname.com`.

1. **Vercel, add the domain**: project `race-buddy` > Settings > Domains > add `newname.com`. Add the DNS records Vercel shows at the place you bought the domain. Wait until Vercel says "Valid Configuration".
2. **Vercel, set the address**: same project > Settings > Environment Variables > `NEXT_PUBLIC_SITE_URL` = `https://newname.com` (Production). Then Deployments > latest > Redeploy.
3. **Supabase, allow sign-in links**: Authentication > URL Configuration. Set Site URL to `https://newname.com` and add `https://newname.com/auth/confirm` to Redirect URLs. Keep the old ones until everything works.
4. **Resend, send from the domain**: Domains > Add domain > `newname.com`. Add the DNS records it shows, then press Verify.
5. **Vercel, set the sender**: `race-buddy` > Environment Variables > `EMAIL_FROM` = `alerts@newname.com` (just the address; the name shown comes from `brand.ts`). Redeploy.

Pass: sign up on `https://newname.com` with a new email, and the confirm link in the email opens `newname.com`, not the old `vercel.app` address.

The dev site can stay on `race-buddy-dev.vercel.app`, or use `dev.newname.com` with the same steps on project `race-buddy-dev`.
