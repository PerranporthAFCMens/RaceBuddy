import { brand } from "@/design/brand";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Safety tips" };

const TIPS: [string, string][] = [
  ["Meet somewhere public", "For a first session, pick a busy gym, a parkrun or the race venue. Not someone's home."],
  ["Tell someone", "Let a friend know who you're meeting, where and when. Share your live location if you can."],
  ["Get there yourself", "Make your own way there and back, so you can leave whenever you want."],
  ["Keep money out of it", "Never send money, bank details or gift cards. Ticket name changes are paid to the organiser, not to another athlete."],
  ["Keep chats here at first", "Stay in the app until you know them. It's where you can block and report."],
  ["Trust your gut", "If something feels wrong, leave, block them and report it. You don't need a reason."],
];

export default function Safety() {
  return (
    <main className="mx-auto max-w-xl flex-1 px-4 py-10">
      <Logo />
      <h1 className="heading mt-8 mb-6">Safety tips</h1>
      <ol className="space-y-4 text-sm">
        {TIPS.map(([title, body], i) => (
          <li key={title} className="card p-4">
            <p className="font-bold uppercase">
              {i + 1}. {title}
            </p>
            <p className="mt-1 text-muted">{body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-6 space-y-2 border border-danger p-4 text-sm">
        <p className="font-bold uppercase text-danger">In danger?</p>
        <p>
          Call 999. For something that isn&apos;t an emergency, call the police on 101. Then report the person in {brand.name}.
        </p>
      </div>
      <Link href="/" className="btn-line mt-8 w-full">
        Back
      </Link>
    </main>
  );
}
