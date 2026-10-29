# Race Buddy

The partner finder for doubles and relay fitness races. Athletes whose partner has dropped out, and athletes without a ticket who want in, find each other, chat, and lock in a team before race day. KeltX is the first organiser.

This is the first version: sign-up (18+), race profiles with ticket flags, a see-all browse feed with filters, partner requests, live chat (pairs and relay team chats), lock-in, and block/report.

## Stack, and why

| Piece | Choice | Why |
| --- | --- | --- |
| App | **Next.js 16** (App Router, TypeScript, Tailwind) | One codebase for the site and the app screens. Server-rendered, so it's fast on phones and keeps API keys on the server. |
| Backend | **Supabase** (Postgres, Auth, Storage, Realtime) | Accounts, database, profile photos and live chat in one service with a free tier. Security rules live in the database (row level security), so the iOS app later gets the same protection. |
| Hosting | **Vercel** | Made for Next.js; deploys every PR to a preview link. |
| iOS later | **Capacitor** | Wraps the web app in a native shell for the App Store, adding push notifications and Apple sign-in. The screens are already mobile-first with safe-area spacing and a bottom tab bar, so little changes. |

## Accounts you need

1. **Supabase** (free): create a project in London (eu-west-2).
2. **Vercel** (free Hobby plan to start): import this GitHub repo.
3. **Stripe** (next step, for name-change payments): KeltX connects their own Stripe account to Race Buddy.

## Setting up

1. In Supabase, open **SQL editor** and run, in order:
   - `supabase/migrations/20261029120000_core.sql` (tables, security rules, chat, photo storage)
   - `supabase/seed.sql` (KeltX and the Exeter 2027 race with its categories)
   - `supabase/migrations/20261029170000_looking_for.sql` ("what you're looking for", matching and match alerts)

   Or with the Supabase CLI: `supabase link` then `supabase db push`.
2. In Supabase **Authentication > URL configuration**, set the Site URL to your Vercel address and add `https://<your-domain>/auth/confirm` to the redirect URLs.
3. Copy `.env.example` to `.env.local` and fill it in (Supabase **Project settings > API**). In Vercel, add the same values under **Settings > Environment variables**.
4. `npm install` then `npm run dev` and open http://localhost:3000.

Keep `SUPABASE_SERVICE_ROLE_KEY` and `TICKET_TAILOR_API_KEY` server-only. Never commit `.env.local`.

### Keeping races up to date

`npm run sync:tickettailor` copies KeltX's upcoming events and adult race categories from Ticket Tailor. It reads only events and ticket types, no personal data. Spectator, transfer and junior (NeX GEN, Foundations) tickets are skipped.

## How the rules work

- **18+ only**: checked at sign-up, in the profile form, and by the database.
- **Ticket flags**: everyone says whether they have a ticket. Adding an order reference checks with Ticket Tailor that the order exists, is for that race and category, and isn't cancelled, then shows **Verified ticket**. People can't set the badge themselves, and one order can only verify one listing.
- **Privacy**: other athletes see first name, age (never date of birth), photo and race details. Email is never shown. Chats are visible only to their members. Organisers can't see chats.
- **What you're looking for**: everyone picks a situation: a spare spot (has a ticket), a spot on a team, or a single looking for another single. Spare spots match the other two, and singles match each other, in an overlapping category. Each person can narrow it by partner 5km pace and area. Browse opens on **For you** (matches), with **Everyone** a tap away.
- **Match alerts**: when a listing is saved, the database queues an alert for everyone it suits who has alerts on, and the app emails them through Resend (at most one email per person every 6 hours, plus a daily catch-up job). Push notifications come with the iOS app: the `alerts_push` switch is already stored.
- **Requests first**: chat opens only when the other person (or relay captain) accepts.
- **Relays**: a relay ticket holder's listing becomes a team listing ("needs 2 of 4"). Everyone accepted joins one team group chat, and the captain locks in each athlete.
- **Lock-in**: the ticket holder proposes, the partner confirms. Both enter their full name and agree to share it with the organiser. Both listings then show **Matched** and leave the feed.
- **Block and report** from any chat. Blocked people disappear from each other's feed and can't message.

## Checks

```bash
npm run lint && npm run typecheck && npm test   # app
npm run test:db                                  # schema + security rules on a throwaway local Postgres (run as a non-root user)
npm run test:live                                # whole flow against the real Supabase project with throwaway users, cleaned up after
```

CI runs all of these on every PR.

## What's next

1. **Name-change payment**: Stripe Connect into KeltX's own account (fee set by KeltX, one fee per ticket), then a single-use 100%-off Ticket Tailor discount code for the "Ticket Transfer / Name Change" ticket. Needs KeltX to tick the discounts permission on their API key.
2. **Organiser view**: Race Buddy admin, organiser owner and read-only staff roles. Headline numbers, locked-in swaps and fees. No chats.
3. **Polish**: email/push alerts for new requests and messages, Apple and Google sign-in, distance by postcode, KeltX race photos.
4. **iOS app** with Capacitor.
