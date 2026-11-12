import { brand } from "@/design/brand";
import Link from "next/link";
import type { ReactNode } from "react";
import { ContactLine } from "@/components/ContactLine";
import { Logo } from "@/components/Logo";
import { LIABILITY_CAP_GBP, OPERATOR, TERMS_VERSION } from "@/lib/legal";

export const metadata = { title: "Terms of Use" };

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-bold uppercase text-fg">{title}</h2>
      {children}
    </section>
  );
}

// Plain-English terms, approved by the owner. Written to keep the service's
// promises small: it makes introductions only, checks nobody, and is free.
export default function Terms() {
  const n = brand.name;
  return (
    <main className="mx-auto max-w-xl flex-1 px-4 py-10">
      <Logo />
      <h1 className="heading mt-8 mb-2">Terms of Use</h1>
      <p className="mb-6 text-center text-xs text-muted">Version {TERMS_VERSION}</p>
      <div className="space-y-6 text-sm text-muted">
        <Part title="These terms">
          <p>
            These terms are the agreement between you and {OPERATOR ? `${OPERATOR}, trading as ${n}` : n} (&quot;we&quot;, &quot;us&quot;).
            By creating an account you agree to them. If you don&apos;t agree, don&apos;t use {n}.
          </p>
        </Part>

        <Part title={`What ${n} does`}>
          <p>
            {n} only introduces athletes who need a race partner or team-mates. That is all we do. We are not the race organiser,
            we don&apos;t sell tickets, we don&apos;t handle name changes and we don&apos;t take or hold any money. Tickets, name
            changes, refunds and race rules are between you and the race organiser, under their terms. We don&apos;t promise you
            will find a partner, or that an organiser will accept a name change.
          </p>
        </Part>

        <Part title="Who can use it">
          <p>
            You must be 18 or over. Give your real date of birth and honest details, keep one account only, and keep your login to
            yourself. We may suspend or close any account we think belongs to someone under 18.
          </p>
        </Part>

        <Part title="We don't check people">
          <p>
            We don&apos;t check anyone&apos;s identity, background, fitness or criminal record. &quot;Verified ticket&quot; only
            means an order reference matched an order for that race and category when it was checked. It does not tell you who
            the person is.
          </p>
        </Part>

        <Part title="Your own risk">
          <p>
            You choose who to message, meet, train and race with, and you do so at your own risk. Any arrangement you make with
            another athlete or an organiser is between you and them, not us. Never send money to another athlete. Read our{" "}
            <Link href="/safety" className="underline">
              safety tips
            </Link>{" "}
            before meeting anyone. They are general tips, not advice.
          </p>
        </Part>

        <Part title="How to behave">
          <ul className="list-disc space-y-1 pl-5">
            <li>No harassment, threats, abuse, hate, or sexual messages or images.</li>
            <li>No spam, scams, selling, or asking people for money or bank details.</li>
            <li>Don&apos;t pretend to be someone else, and don&apos;t share other people&apos;s private details.</li>
            <li>Nothing illegal, and nothing that harms {n} or the people using it.</li>
          </ul>
        </Part>

        <Part title="What you post">
          <p>
            You are responsible for everything you post. It stays yours, but you let us show it in {n} and keep copies we need for
            safety records. We may remove anything, at any time.
          </p>
        </Part>

        <Part title="Reports and moderation">
          <p>
            You can block anyone, and report a profile, a chat or a single message. We don&apos;t read chats or scan them
            automatically. We act on what is reported to us, and we remove illegal content when we become aware of it. When you
            report a message, we keep a copy of it and the few messages before it. Race organisers can&apos;t read chats. If we
            ask an organiser&apos;s staff to help moderate an event, they see reported messages only, as we do.
          </p>
          <p>
            We decide what to do about a report. We may remove content, warn, suspend or close an account, with or without
            notice. We don&apos;t have to act on every report or explain our decision. We may share information with the police
            or other authorities where the law requires it or we think someone is at risk.
          </p>
        </Part>

        <Part title="Complaints and appeals">
          <p>
            To complain about another user, about us, or about a decision on your account, <ContactLine />. We will look at every
            complaint.
          </p>
        </Part>

        <Part title="The service">
          <p>
            {n} is free and provided &quot;as is&quot;. We may change, pause or stop it, or any part of it, at any time. We
            don&apos;t promise it will always be available, free of errors, or that information on it is accurate. We may close
            any account at any time.
          </p>
        </Part>

        <Part title="Our liability">
          <p>As far as the law allows, we are not responsible for:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>what other users say or do, on {n} or when you meet;</li>
            <li>injury, loss or damage at training, at a race or travelling to one;</li>
            <li>tickets, entries, name changes, refunds or money you lose or pay;</li>
            <li>the service being unavailable, or data being lost;</li>
            <li>any indirect loss, or loss we could not have expected.</li>
          </ul>
          <p>
            Otherwise, the most we will pay for all claims is £{LIABILITY_CAP_GBP}. Nothing in these terms limits liability for
            death or personal injury caused by our negligence, for fraud, or for anything else the law does not let us limit, and
            nothing affects your legal rights as a consumer.
          </p>
        </Part>

        <Part title="If you break these terms">
          <p>
            If you break these terms or the law, you are responsible for the loss or costs this causes us, including if someone
            makes a claim against us because of it.
          </p>
        </Part>

        <Part title="Ending">
          <p>
            You can delete your account at any time on My profile. When an account ends, the parts of these terms about what you
            post, safety records, liability and breaking these terms still apply.
          </p>
        </Part>

        <Part title="Changes and the small print">
          <p>
            We may update these terms. If a change matters, we&apos;ll ask you to agree again; if you don&apos;t, stop using{" "}
            {n} and delete your account. These terms and our{" "}
            <Link href="/privacy" className="underline">
              privacy notice
            </Link>{" "}
            are the whole agreement. We may pass this agreement to whoever takes over {n}. Only you and we have rights under it. If
            a court finds part of it invalid, the rest still applies. The law of England and Wales applies and its courts decide
            disputes, but if you live in Scotland or Northern Ireland you can also use your local courts.
          </p>
        </Part>
      </div>
      <Link href="/" className="btn-line mt-8 w-full">
        Back
      </Link>
    </main>
  );
}
