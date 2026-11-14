import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { brand } from "@/design/brand";
import { getUser } from "@/lib/data";
import { consoleNext } from "@/lib/safe-next";
import { LoginForm } from "../LoginForm";

export const metadata = { title: "Organiser sign in" };

/**
 * The organiser door: event owners and the site admin sign in here and go
 * straight to their console. No racer profile is needed.
 */
export default async function OrganiserLoginPage({ searchParams }: PageProps<"/login/organiser">) {
  const params = await searchParams;
  const next = consoleNext(params.next);
  if (await getUser()) redirect(next);
  const failed = params.error === "link";

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <div className="mb-10 text-center">
        <Logo />
      </div>
      <h1 className="heading mb-3">Organiser sign in</h1>
      <p className="mb-8 text-center text-sm text-muted">
        For race organisers and their team. Manage your events on {brand.name}. You don&apos;t need a racer profile.
      </p>
      {failed && (
        <p role="alert" className="mb-4 border border-danger px-3 py-2 text-sm text-danger">
          That link has expired or was already used. Try again below.
        </p>
      )}
      <LoginForm initialMode="signin" next={next} situation={null} door="organiser" />
      <p className="mt-8 text-center text-sm text-muted">
        Racing?{" "}
        <Link href="/login" className="underline">
          Athlete sign in
        </Link>
      </p>
    </main>
  );
}
