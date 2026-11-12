# Moderation procedure (draft)

Date: 2026-11-12. Status: draft for owner and legal review. Next review: by
2027-11-12.

## Who

- **Moderator and accountable person:** the owner (Adam), listed as an admin.
  Admins are added only by SQL that the owner runs.
- Organisers never see reports, evidence or chats.
- **Later, by choice:** the owner may let an event's organiser staff moderate
  that event. Before switching it on: a signed agreement with the organiser,
  updated Terms and Privacy, and organiser moderators follow this same
  procedure. The owner keeps oversight and still handles urgent and under-18
  reports.
- An admin can't take action against another admin.

## Where

`My profile` > `Moderation` on the website (admins only; everyone else gets
"page not found"). Filters: Open, Under 18, Closed, All. Urgent reports come
first.

## How often

- Check open reports **at least once every working day**, and check the safety
  email (`SAFETY_EMAIL` in `src/lib/legal.ts`) at the same time.
- **Urgent** (threats, suspected under 18): act the same day.
- **High** (harassment): within 2 working days.
- **Normal** (profile, spam, impersonation, other): within 5 working days.
- Complaints and appeals: reply within 5 working days (as the Terms say), and
  sooner for anything about safety.

## Steps for a report

1. Open the report. Mark it as **reviewing** if it will take time.
2. Read the reporter's category and details, and the reported person's
   record (age, joined date, status, past reports made and against them, how
   many people have blocked them).
3. **Evidence** (only if the report is about a message): choose "View
   evidence" and type why you need it (at least 5 characters). This shows the
   reported message and up to 5 before it. Every view is logged. Don't open
   evidence you don't need.
4. Decide, and always add a short note saying why:
   - **Dismiss**: no breach of the Terms.
   - **Warn**: a first or minor breach. The person sees the warning message.
   - **Suspend**: serious, repeated, or while checking a suspected under-18.
     They can read chats but can't message, request, change listings or lock
     in, and are hidden from others.
   - **Ban**: very serious (threats, scams, sexual content, confirmed under
     18). Their email is stored as a hash so they can't sign up again.
   - **Reinstate**: return an account to active after a check or an appeal.
   - **Resolve**: close the report once action is taken.
5. Tell the reporter nothing about the other person beyond "we've looked into
   it", unless the law requires otherwise.

## Suspected under 18

1. Suspend the account straight away (the report is urgent).
2. If needed, ask them by email for evidence of age. Don't keep copies of ID
   documents: look, note "seen" in the decision, and delete.
3. If they are under 18, ban the account. If they are 18 or over, reinstate
   it. If the date of birth was wrong but they are an adult, an admin can fix
   it.

## Danger or a crime

- If someone may be in immediate danger, call 999.
- Report child sexual exploitation to the police (and CEOP).
- Keep the evidence for longer than 12 months only if the police ask; note
  this in the decision.

## Complaints and appeals

- People complain or appeal by email to the safety address, or by using
  Report and choosing "Something else".
- An appeal is looked at again with fresh eyes (a second person, if
  available). Record the result as a note, and reinstate if the decision was
  wrong.

## Records and retention

- Every decision, with its note, is stored in `moderation_actions`; every
  evidence view in `evidence_access_log`.
- Closed reports, their evidence and logs are deleted automatically 12 months
  after closing (the daily job `purge_closed_reports`).
- Reports are kept if either account is deleted.

## Freedom of expression and privacy

- Act on breaches of the Terms, not on opinions people disagree with.
- Only open message evidence when a report needs it; never browse chats.
