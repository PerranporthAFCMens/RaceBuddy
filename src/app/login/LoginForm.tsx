"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { sendSignInLink, signIn, signUp } from "./actions";

type Mode = "signin" | "signup" | "link";

export function LoginForm({ initialMode, next }: { initialMode: Mode; next: string }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [signInState, signInAction] = useActionState(signIn, undefined);
  const [signUpState, signUpAction] = useActionState(signUp, undefined);
  const [linkState, linkAction] = useActionState(sendSignInLink, undefined);

  const action = mode === "signin" ? signInAction : mode === "signup" ? signUpAction : linkAction;
  const state = mode === "signin" ? signInState : mode === "signup" ? signUpState : linkState;

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 border border-edge" role="tablist">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-11 text-sm font-semibold uppercase tracking-wide ${mode === m ? "bg-fg text-bg" : "text-muted"}`}
          >
            {m === "signin" ? "Sign in" : "Join"}
          </button>
        ))}
      </div>

      <ActionForm action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="field-label">Email</span>
          <input className="input" name="email" type="email" autoComplete="email" required />
        </label>
        {mode !== "link" && (
          <label className="block">
            <span className="field-label">Password</span>
            <input
              className="input"
              name="password"
              type="password"
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
            />
          </label>
        )}
        {mode === "signup" && (
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="adult" className="mt-1 h-5 w-5 accent-accent" required />
            <span>
              I am 18 or over and agree to the <Link href="/privacy" className="underline">privacy notice</Link>.
            </span>
          </label>
        )}
        <FormMessage state={state} />
        <SubmitButton pendingText="One moment…">
          {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Email me a link"}
        </SubmitButton>
      </ActionForm>

      <button
        type="button"
        onClick={() => setMode(mode === "link" ? "signin" : "link")}
        className="btn-ghost mt-4 w-full"
      >
        {mode === "link" ? "Use a password instead" : "Forgot password? Email me a sign-in link"}
      </button>
    </div>
  );
}
