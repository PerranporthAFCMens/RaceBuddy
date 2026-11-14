import Link from "next/link";
import { StateForm } from "@/components/console/StateForm";
import { brand } from "@/design/brand";
import { requireUser } from "@/lib/data";
import { setPassword } from "../actions";

export const metadata = { title: "Welcome" };

/** Where an organiser's invite link lands: set a password, then on to their events. */
export default async function OrganiserWelcomePage() {
  const user = await requireUser();
  return (
    <section className="mx-auto max-w-sm space-y-4">
      <h1 className="heading">Welcome to {brand.name}</h1>
      <p className="text-center text-sm text-muted">
        Set a password for {user.email ?? "your account"} so you can sign in any time.
      </p>
      <StateForm action={setPassword} submit="Save and see my events" buttonClass="btn-gold w-full" className="space-y-4">
        <label className="block">
          <span className="field-label">Password</span>
          <input className="input" name="password" type="password" minLength={8} autoComplete="new-password" required aria-describedby="pw-hint" />
          <span id="pw-hint" className="mt-1 block text-xs text-muted">At least 8 characters.</span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="adult" className="mt-1 h-5 w-5 accent-accent" required />
          <span>
            I am 18 or over and agree to the <Link href="/terms" className="underline">Terms of Use</Link> and{" "}
            <Link href="/privacy" className="underline">privacy notice</Link>.
          </span>
        </label>
      </StateForm>
      <Link href="/organiser" className="btn-ghost w-full">
        Skip for now
      </Link>
    </section>
  );
}
