import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { brand } from "@/design/brand";
import { getUser } from "@/lib/data";
import { isSituation, SITUATIONS } from "@/lib/matching";
import { consoleNext, safeNext } from "@/lib/safe-next";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

/**
 * The one sign-in page for racers, organisers and the admin. With no `next`,
 * signing in goes to /start, which sends each person to their own home.
 * `door=organiser` (organiser links, and signed-out visits to a console)
 * makes "Join" skip the racer profile.
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const organiser = params.door === "organiser";
  const next = organiser ? consoleNext(params.next) : safeNext(params.next, "/start");
  if (await getUser()) redirect(next);
  const mode = params.mode === "signup" ? "signup" : "signin";
  const failed = params.error === "link";
  const situation = isSituation(params.situation) ? params.situation : null;
  const picked = SITUATIONS.find((s) => s.value === situation);

  const sub = organiser
    ? "Race organisers: sign in to see your events. You don't need a racer profile."
    : picked
      ? `${picked.title}. Create an account and we'll find people who fit.`
      : "Doubles and relay partners for race day.";

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <div className="mb-10 text-center">
        <Logo meaning />
      </div>
      <h1 className="heading mb-3">{mode === "signup" ? "Find your partner" : "Welcome back"}</h1>
      <p className="mb-8 text-center text-sm text-muted">{sub}</p>
      {failed && (
        <p role="alert" className="mb-4 border border-danger px-3 py-2 text-sm text-danger">
          That link has expired or was already used. Try again below.
        </p>
      )}
      <LoginForm
        initialMode={mode}
        next={next}
        situation={situation}
        door={organiser ? "organiser" : "athlete"}
      />
      {!organiser && (
        <p className="mt-8 text-center text-sm text-muted">
          Race organisers and the {brand.name} team sign in here too. You&apos;ll go straight to your events.
        </p>
      )}
    </main>
  );
}
