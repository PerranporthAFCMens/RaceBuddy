import Link from "next/link";
import { Logo } from "@/components/Logo";
import { brand } from "@/design/brand";
import { requireUser } from "@/lib/data";
import { getRoles, homeFor } from "@/lib/roles";

export const metadata = { title: "Wrong account", robots: { index: false } };

const FOR = {
  admin: { text: `the ${brand.name} admin`, next: "/admin" },
  organiser: { text: "race organisers", next: "/organiser" },
} as const;

/**
 * Shown when someone opens a console their account can't use, instead of
 * "page not found". Says who they're signed in as and how to switch.
 */
export default async function WrongAccountPage({ searchParams }: PageProps<"/wrong-account">) {
  const params = await searchParams;
  await requireUser();
  const roles = await getRoles();
  const target = params.for === "admin" ? FOR.admin : FOR.organiser;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <Logo href={homeFor(roles)} />
      <h1 className="heading mt-10">Wrong account</h1>
      <p className="mt-4 text-sm">
        This page is for {target.text}. You&apos;re signed in as{" "}
        <b className="break-all">{roles?.email ?? "another account"}</b>, which can&apos;t open it.
      </p>
      <div className="mt-8 grid w-full gap-3">
        <form action="/auth/signout" method="post">
          <input type="hidden" name="next" value={`/login?next=${encodeURIComponent(target.next)}`} />
          <button className="btn-gold w-full">Sign in with another account</button>
        </form>
        <Link href={homeFor(roles)} className="btn-line">
          Back to my home
        </Link>
      </div>
    </main>
  );
}
