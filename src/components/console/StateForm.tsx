"use client";
import { useActionState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import type { ActionState } from "@/lib/types";

/**
 * A console form: the fields go in as children, then the result message and
 * the button. `action` is a server action that returns an ActionState.
 */
export function StateForm({
  action,
  children,
  submit,
  pendingText = "Saving…",
  className = "space-y-3",
  buttonClass,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submit: string;
  pendingText?: string;
  className?: string;
  buttonClass?: string;
}) {
  const [state, run] = useActionState(action, undefined);
  return (
    <ActionForm action={run} className={className}>
      {children}
      <FormMessage state={state} />
      <SubmitButton pendingText={pendingText} className={buttonClass}>
        {submit}
      </SubmitButton>
    </ActionForm>
  );
}
