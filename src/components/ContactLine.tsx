import { SAFETY_EMAIL } from "@/lib/legal";

/** How to reach the team about safety, complaints or your data. */
export function ContactLine() {
  return SAFETY_EMAIL ? (
    <>
      email <a href={`mailto:${SAFETY_EMAIL}`} className="underline">{SAFETY_EMAIL}</a>
    </>
  ) : (
    <>use Report on the person&apos;s profile or in the chat (choose &quot;Something else&quot; for a complaint about us)</>
  );
}
