# Safety records

Written records for the UK Online Safety Act 2023 and data protection. These
are **drafts prepared with AI help for the owner and a solicitor to review**.
They are not legal advice, and having them does not make the service legally
compliant on its own.

The product name in these records is "the service" because the name is not
final (see `src/design/brand.ts`).

| Record | What it is | Last reviewed | Next review due |
| --- | --- | --- | --- |
| [Illegal content risk assessment](illegal-content-risk-assessment.md) | How the service could be used for illegal harm, how likely, and what reduces it | 2026-11-12 (draft) | 2027-11-12, or before a significant change |
| [Children's access assessment](childrens-access-assessment.md) | Whether children are likely to use the service (two-stage test) | 2026-11-12 (draft) | 2027-11-12, or sooner (see triggers) |
| [Moderation procedure](moderation-procedure.md) | How reports, evidence, decisions, complaints and appeals are handled | 2026-11-12 (draft) | 2027-11-12 |

## Who is responsible

- **Named person accountable for safety:** the owner (Adam), as the service's
  admin. Organisers (for example KeltX) never see reports or chats.
- **Safety and complaints contact:** the address in `SAFETY_EMAIL`
  (`src/lib/legal.ts`), shown on the Terms and Privacy pages. It must be
  checked at least every working day.

## Re-assess early when

- an under-18 user is found, or under-18 reports increase;
- the service is marketed beyond adult race entrants, or adds new features
  (for example group chats, public posts, photo sharing in chat, payments);
- users grow well beyond a few hundred;
- Ofcom changes its codes or guidance in a way that affects small services.

## Still needs the owner or a solicitor

- Approve these three records, the Terms of Use and the Privacy notice.
- Name the data controller (person or company) on the Privacy page.
- Check whether the ICO data protection fee is due.
- Confirm the children's access conclusion (currently "probably not met, low
  confidence").
- Check the measures against the current version of Ofcom's illegal content
  codes (amended in 2026).
