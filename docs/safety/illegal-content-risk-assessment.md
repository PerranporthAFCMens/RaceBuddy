# Illegal content risk assessment (draft)

Date: 2026-11-12. Status: draft for owner and legal review. Next review: by
2027-11-12, or before a significant change (see [README](README.md)).

## 1. The service

- A UK website where adults (18+) entering fitness races find a race partner
  or team-mates. About 100 users expected at first.
- **What users can do with each other:** see a race profile (first name,
  photo, age, area, gym, home town, bio, times, links), send a partner
  request, and chat one-to-one **only after a request is accepted**. Reactions
  and replies in chat. Lock in a team, which shares entered full names with
  the race organiser.
- **What users cannot do:** post publicly, create groups, livestream, send
  money to each other in the app, or search by anything other than race and
  category. No search engine indexing of profiles (sign-in needed).
- Likely a regulated **user-to-user service**: users share content (profiles
  and messages) with other users, and it is aimed at UK users. It is a small
  service, not Category 1 or 2.

## 2. Risk factors

| Factor | Present? | Effect |
| --- | --- | --- |
| One-to-one private messaging | Yes | Raises risk of harassment, threats, scams, grooming |
| Users meet in person to train or race | Yes | Raises risk of stalking and offline harm |
| Profiles with photos and location (area, gym) | Yes | Raises risk of stalking and impersonation |
| Strangers can contact anyone | No: a request must be accepted first | Lowers most risks |
| Anonymous or throwaway accounts | Partly: email sign-up, no ID check | Raises risk of fake profiles |
| Children on the service | Not intended; self-declared 18+ only | See [children's access assessment](childrens-access-assessment.md) |
| Public posts, groups, file sharing, livestreaming | No | Lowers risk |
| Payments between users | No | Lowers fraud risk |
| Size | Very small | Lowers reach of any harm |

## 3. Assessment by kind of illegal harm

Likelihood and impact are rated **low**, **medium** or **high** for this
service as it is today, with the safeguards below in place.

| Harm (Ofcom priority offence area) | How it could happen here | Likelihood | Impact | Overall |
| --- | --- | --- | --- | --- |
| Harassment, stalking, threats, abuse | Unwanted messages after a request is accepted; following someone met at a race; using gym or area to find them | Medium | High | **Medium** |
| Fraud and financial scams (incl. romance scams, ticket scams) | Asking a partner to pay for a ticket or name change directly; fake "selling" | Low to medium | Medium | **Medium** |
| Intimate image abuse, cyberflashing | Sending sexual images; chat is text only, but links could be shared | Low | High | **Low to medium** |
| Grooming and child sexual exploitation | Only if a child joins by lying about age | Low | Very high | **Medium** (kept under watch) |
| Hate offences | Abusive messages | Low | Medium | **Low** |
| Impersonation, false identity | Fake profile pretending to be a known athlete | Low | Medium | **Low** |
| Terrorism, extreme content, drugs, weapons, suicide encouragement, CSAM sharing | No public posting or media sharing; tiny private service | Very low | High | **Low** |

## 4. What is in place to reduce the risk

All enforced in the database (not only on screen) unless stated.

- **Adults only:** date of birth needed before use; under-18s are refused;
  date of birth can't be changed afterwards except by an admin; tick box
  confirming 18+ and agreeing to the Terms. Other users see age, never date of
  birth. Users can report "suspected under 18".
- **Contact control:** chats open only after both people agree; only chat
  members can read or send; changing a chat ID in the address shows nothing.
- **Blocking:** from a profile or a chat; stops messages, reactions, requests
  and lock-ins both ways; the other person isn't told; can be undone from My
  profile.
- **Reporting:** from a profile, a chat or a single message, with categories.
  Threats and suspected under-18 are **urgent**, harassment is **high**.
  Reporter sees a confirmation. Reports are kept even if either account is
  deleted.
- **Evidence, limited:** reporting a message saves a copy of it and up to 5
  before it. Admins can open only that copy, must give a reason, and every
  view is logged. Nobody browses private chats.
- **Action:** admins can warn, suspend, ban and reinstate. Suspended and
  banned users are hidden and can't message, react, request, change listings
  or lock in. Banned emails are stored only as a hash to stop re-registering.
  Every decision is recorded with a note.
- **Rate limits:** messages (20 a minute, 300 an hour), requests (20 an hour,
  50 a day), reports and reactions.
- **Information:** Terms of Use (conduct rules, what we can do, complaints),
  Safety tips page (meet in public, tell someone, never send money, 999/101),
  Privacy notice.
- **Organisers** never see chats or reports.

## 5. Gaps and planned improvements

| Gap | Risk it leaves | Plan |
| --- | --- | --- |
| No alert to the admin when an urgent report arrives | An urgent report could wait until the admin next checks | Email alert once email sending (Resend) is switched on |
| "Typing" indicator uses an open realtime channel | Someone who knew a chat ID could see typing events (no text) | Make the channel private |
| No identity checks | Fake profiles possible | Accept for now (proportionate at this size); review if reports of fake profiles appear |
| No message keyword filters | Scams or abuse rely on reports | Optional; reconsider if reports rise |

## 6. Conclusion (draft)

The highest risks are **harassment and stalking** and **scams**, both
**medium**. Grooming is rated **medium** only because self-declared age can't
rule out a child joining; the impact would be severe, so under-18 reports are
urgent and acted on at once. The measures above match the core set Ofcom
recommends for small, low-risk services (a named accountable person, a
moderation process, easy reporting, complaints with timeframes, clear terms).

This is a draft. A solicitor should confirm the ratings and check them against
the current Ofcom illegal content codes before the service goes live.
