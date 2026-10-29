"use client";
import Link from "next/link";
import { Logo } from "./Logo";

/** The "Oops" screen for dead links and errors: on-brand, with a way back. */
export function Oops({
  title,
  body,
  retry,
}: {
  title: string;
  body: string;
  retry?: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <Logo />
      <p className="mt-10 font-display text-6xl uppercase leading-none text-accent">Oops</p>
      <h1 className="mt-4 text-xl uppercase tracking-wide">{title}</h1>
      <p className="mt-3 text-sm text-muted">{body}</p>
      <div className="mt-8 grid w-full gap-3">
        {retry ? (
          <button type="button" className="btn-gold" onClick={() => retry()}>
            Try again
          </button>
        ) : (
          <button type="button" className="btn-gold" onClick={() => history.back()}>
            Go back
          </button>
        )}
        <Link href="/browse" className="btn-line">
          Go to Browse
        </Link>
      </div>
    </main>
  );
}
