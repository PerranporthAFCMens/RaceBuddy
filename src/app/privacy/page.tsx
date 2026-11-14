import { brand } from "@/design/brand";
import Link from "next/link";
import { ContactLine } from "@/components/ContactLine";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Privacy" };

// Plain-English draft. Must be approved by the owner (ideally a solicitor)
// before it goes on the live site.
export default function Privacy() {
  const n = brand.name;
  return (
    <main className="mx-auto max-w-xl flex-1 px-4 py-10">
      <Logo />
      <h1 className="heading mt-8 mb-6">Privacy</h1>
      <div className="space-y-6 text-sm text-muted">
        <section className="space-y-2">
          <h2 className="font-bold uppercase text-fg">What we collect</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Your email address and password (stored securely; we never see your password).</li>
            <li>Your date of birth, to check you are 18 or over. Other athletes see your age, never your date of birth.</li>
            <li>Your race profile: first name, photo, area, gym, home town, bio, times and any links you add.</li>
            <li>Your race listings, requests, chats and lock-ins.</li>
            <li>Reports you make or that are made about you, and any decisions we take on them.</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="font-bold uppercase text-fg">Who sees what</h2>
          <p>
            Other signed-in athletes see your race profile and listings. Your email address is never shown. Messages are private to
            the people in the chat. Race organisers never see chats, reports or your email. The organiser of a race you list for
            sees your listing as other athletes do (first name, age, category, ticket and status) and can take a listing off
            their race. If someone listed on their race is reported, the organiser is only told that a report is being
            reviewed, never who made it, who it is about or what was said. When you lock in a team, you agree to share the full names you enter with the race organiser, so they
            can update the start list.
          </p>
          <p>
            If you give an order reference, we check with Ticket Tailor that the order exists and is for the right race and
            category. We don&apos;t read names or emails from Ticket Tailor.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-bold uppercase text-fg">Reports and safety</h2>
          <p>
            When someone reports a message, we keep a copy of that message and up to 5 before it with the report. Only our moderators can open it, they must give a reason, and every look is recorded. Nobody browses private chats.
            If we close an account, we keep a scrambled (hashed) copy of its email address so it can&apos;t sign up again.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-bold uppercase text-fg">Why we use it</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>To run the service you signed up for (finding partners, chat, lock-ins).</li>
            <li>To keep people safe: age checks, reports, moderation and preventing abuse. This is in our legitimate interests.</li>
            <li>To share your name with the organiser at lock-in, with your consent.</li>
            <li>To fix problems: crash reports with personal details removed.</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="font-bold uppercase text-fg">How long we keep it</h2>
          <p>
            Your profile, listings and messages stay until you delete your account; then they are deleted. Reports and the
            evidence attached to them are kept for 12 months after the report is closed, even if an account is deleted, unless
            the police need them for longer. Scrambled emails of closed accounts are kept so the ban works.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-bold uppercase text-fg">Where it is stored</h2>
          <p>
            We use Supabase (database, UK region), Vercel (website, London), Sentry (crash reports, EU) and Resend (email
            alerts). They process data only on our instructions.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-bold uppercase text-fg">Your rights</h2>
          <p>
            You can ask for a copy of your data, ask us to correct or delete it, or object to how we use it. To do this,{" "}
            <ContactLine />. You can delete your account yourself on My profile. If you&apos;re unhappy with how we handle your
            data, you can complain to the Information Commissioner&apos;s Office at{" "}
            <a href="https://ico.org.uk/make-a-complaint/" className="underline" target="_blank" rel="noopener noreferrer">
              ico.org.uk
            </a>
            .
          </p>
        </section>
        <p>
          {n} is for adults (18+). See also our{" "}
          <Link href="/terms" className="underline">
            Terms of Use
          </Link>
          .
        </p>
      </div>
      <Link href="/" className="btn-line mt-8 w-full">
        Back
      </Link>
    </main>
  );
}
