"use client";
import { createContext, useContext, useTransition } from "react";

const PendingContext = createContext<boolean | null>(null);

/** True while the surrounding ActionForm is submitting, or null outside one. */
export function useActionFormPending() {
  return useContext(PendingContext);
}

/**
 * A form that runs a server action without clearing what the person typed.
 * React 19 resets a plain <form action={...}> after every submit, so a wrong
 * password wiped the email box and a saved race listing showed as blank.
 */
export function ActionForm({
  action,
  className,
  children,
}: {
  action: (formData: FormData) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        const submitter = (e.nativeEvent as SubmitEvent).submitter;
        const formData = new FormData(e.currentTarget, submitter);
        startTransition(() => action(formData));
      }}
    >
      <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
    </form>
  );
}
