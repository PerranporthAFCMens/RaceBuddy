import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Privacy" };

// Plain-English summary for the first version. Needs a proper review before launch.
export default function Privacy() {
  return (
    <main className="mx-auto max-w-xl flex-1 px-4 py-10">
      <Logo />
      <h1 className="heading mt-8 mb-6">Privacy</h1>
      <div className="space-y-4 text-sm text-muted">
        <p>Race Buddy is for adults (18+). We ask for your date of birth to check this. Other athletes see your age, never your date of birth.</p>
        <p>Other signed-in athletes can see your race profile: first name, photo, age, race details, gym, home town and bio. Your email address is never shown.</p>
        <p>Messages are private to the people in the chat. Race organisers never see chats.</p>
        <p>If you give an order reference, we check with Ticket Tailor that the order exists and is for the right race and category. We don&apos;t read names or emails from Ticket Tailor.</p>
        <p>When you lock in a team, you agree to share the full names you enter with the race organiser, so they can update the start list.</p>
        <p>You can block or report anyone from a chat. Deleting your account deletes your profile, listings and messages.</p>
      </div>
      <Link href="/" className="btn-line mt-8 w-full">Back</Link>
    </main>
  );
}
