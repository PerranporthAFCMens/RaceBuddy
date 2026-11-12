# 2026-11-12: Terms of Use, safety tips, privacy notice (safety part 2b)

- `/terms`: plain-English Terms of Use draft (what the app is, 18+, conduct,
  messaging/blocking/reporting, warnings/suspension/bans, complaints and
  appeals, meeting people, account and data). Version in `src/lib/legal.ts`.
- `/safety`: safety tips for meeting a partner, plus 999/101.
- `/privacy`: rewritten to cover what is collected, who sees it, report
  evidence, lawful reasons, retention (reports 12 months after closing),
  where data is stored, rights and the ICO.
- Contact: `SAFETY_EMAIL` in `src/lib/legal.ts` is empty until Adam picks a
  dedicated address; pages point to in-app Report until then.
- Acceptance: sign-up box now names the Terms; a new profile records the
  Terms version (`profiles.terms_version`, time set by the database); people
  with an older or no version see an "I agree" banner on signed-in screens.
- Home footer links to Terms, Privacy and Safety tips. Chats link to Safety
  tips.

Drafts: Adam (ideally a solicitor) must approve the Terms and privacy wording
before release to live. No database change.
