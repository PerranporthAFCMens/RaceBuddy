import { brand } from "@/design/brand";
import Link from "next/link";
import { ContactLine } from "@/components/ContactLine";
import { Logo } from "@/components/Logo";
import { TERMS_VERSION } from "@/lib/legal";

export const metadata = { title: "Terms of Use" };

// Plain-English draft. Must be approved by the owner (ideally a solicitor)
// before it goes on the live site.
export default function Terms() {
  const n = brand.name;
  return (
    <main className="mx-auto max-w-xl flex-1 px-4 py-10">
      <Logo />
      <h1 className="heading mt-8 mb-2">Terms of Use</h1>
      <p className="mb-6 text-center text-xs text-muted">Version {TERMS_VERSION}</p>
      <div className="space-y-6 text-sm text-muted">
        <section className="space-y-2">
          <h2 className="font-bold uppercase text-fg">What {n} is</h2>
          <p>
            {n} helps athletes find a partner or team-mates for fitness races. We are not the race organiser and don&apos;t sell
            tickets. We can&apos;t promise you&apos;ll find a partner. Tickets and name changes are handled by the organiser,
            under their own terms.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-bold uppercase text-fg">Adults only</h2>
          <p>
            You must be 18 or over. Give your real date of birth. If we think someone is under 18, we suspend the account while we
            check, and close it if they are.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-bold uppercase text-fg">How to behave</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Be honest about who you are and your race details.</li>
            <li>No harassment, threats, abuse, hate, or sexual messages or images.</li>
            <li>No spam, scams, selling, or asking people for money or bank details.</li>
            <li>Don&apos;t pretend to be someone else, and don&apos;t share other people&apos;s private details.</li>
            <li>Nothing illegal. We will tell the police where the law requires it or someone is at risk.</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="font-bold uppercase text-fg">Messages, blocking and reporting</h2>
          <p>
            Chats open only when both people agree. Messages are private to the people in the chat, and race organisers never see
            them. You can block anyone, and they aren&apos;t told. You can report a profile, a chat or a single message. When you
            report a message, we keep a copy of it and the few messages before it so we can check what happened.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-bold uppercase text-fg">What we can do</h2>
          <p>
            If someone breaks these terms, we may remove content, warn them, suspend their account or close it, depending on how
            serious it is. Suspended accounts can read their chats but can&apos;t message, send requests or change listings. Every
            decision is recorded with a reason.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-bold uppercase text-fg">Complaints and appeals</h2>
          <p>
            To complain about another user, about us, or about a decision on your account, <ContactLine />. We aim to reply within
            5 working days, and sooner for anything about safety.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-bold uppercase text-fg">Meeting people</h2>
          <p>
            You decide who to meet and train with. Read our{" "}
            <Link href="/safety" className="underline">
              safety tips
            </Link>{" "}
            first. We don&apos;t check people&apos;s identity or background.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-bold uppercase text-fg">Your account and data</h2>
          <p>
            You can delete your account at any time from My profile. Our{" "}
            <Link href="/privacy" className="underline">
              privacy notice
            </Link>{" "}
            explains what we keep and why. We may update these terms. If a change matters, we&apos;ll ask you to agree again.
          </p>
        </section>
      </div>
      <Link href="/" className="btn-line mt-8 w-full">
        Back
      </Link>
    </main>
  );
}
