# Report emails (2026-11-14)

Adam asked for an email to the admin and the event organisers whenever someone is reported, and said it must not land in junk.

- `reportUser` (src/app/(app)/safety/actions.ts) now gets the new report's id back, and uses `after()` to call `notifyNewReport` (src/lib/reports/notify.ts) once the reporter has their answer.
- Admins (everyone in `admins`) get type, priority, the reported person's first name, their upcoming races and a link to `/admin/reports/<id>`. No free text and no messages: the evidence is still only viewed (and logged) in the console.
- Owners of each upcoming race the reported person is listed on get a heads-up only: "a report on <race> is being reviewed". No names or messages (Adam: "let them know there is a report there to be reviewed"). Admins aren't emailed twice.
- Builders are pure (src/lib/reports/email.ts) with unit tests.
- The Privacy "Who sees what" text now says organisers are only told a report is being reviewed.
- Delivery: ygig.co.uk publishes DMARC `p=quarantine` and an SPF record for StackMail only, so unsigned mail goes to junk. ygig.co.uk was added to Resend (eu-west-1, no open/click tracking). Adam adds the DKIM and return-path records in GoDaddy, then sets `RESEND_API_KEY`, `EMAIL_FROM=hello@ygig.co.uk` and `CRON_SECRET` in both Vercel projects. Steps: /mnt/project-files/race-buddy/ygig-emails/report-email-steps.md (outside the repo).
- With no `RESEND_API_KEY`, nothing is sent and reporting works as before.
