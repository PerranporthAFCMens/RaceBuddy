# Faster taps (2026-11-01)

Adam found every tap slow on the dev site on his iPhone.

## What we measured

- Vercel ran the app's server code in Washington DC (`iad1`), the default.
- The Supabase database answers at the same speed as Adam's other project,
  which is in London (`eu-west-2`), so it is almost certainly in London too.
- Each signed-in screen asks the database 4 to 7 questions, mostly one after
  another, so every question crossed the Atlantic and back.
- Timed from near Washington with a throwaway signed-in user (deleted after),
  median of 5: Browse 861 ms, Requests 481 ms, Chats 353 ms, Me 428 ms.
  First Browse after a quiet spell: 1.9 s. A page with no database work: about 180 ms.
  From the UK, add another Atlantic round trip on top.
- There was no loading screen, so after a tap nothing moved until the whole
  new screen arrived.

## What changed

- `vercel.json`: `"regions": ["lhr1"]` runs server code in London, next to the
  database. Applies to both sites once released to `main`.
- `src/app/(app)/loading.tsx` + `src/components/LoadingCards.tsx`: placeholder
  cards appear the instant a tab is tapped; header and tab bar stay put.
- `/styleguide` shows the loading cards (new styleguide screenshot).

## Check after merge

Re-run the same timing on the dev site and compare.
