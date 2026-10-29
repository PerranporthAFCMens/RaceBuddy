import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getUser } from "@/lib/data";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/browse";
  if (await getUser()) redirect(next);
  const mode = params.mode === "signup" ? "signup" : "signin";
  const failed = params.error === "link";

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <div className="mb-10 text-center">
        <Logo />
      </div>
      <h1 className="heading mb-8">{mode === "signup" ? "Find your partner" : "Welcome back"}</h1>
      {failed && (
        <p role="alert" className="mb-4 border border-danger px-3 py-2 text-sm text-danger">
          That link has expired or was already used. Try again below.
        </p>
      )}
      <LoginForm initialMode={mode} next={next} />
    </main>
  );
}
