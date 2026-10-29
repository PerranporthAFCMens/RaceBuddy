"use client";
import { useFormStatus } from "react-dom";
import { useActionFormPending } from "./ActionForm";

export function SubmitButton({
  children,
  pendingText,
  className = "btn-gold w-full",
  name,
  value,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const formStatus = useFormStatus();
  const pending = useActionFormPending() ?? formStatus.pending;
  return (
    <button type="submit" className={className} disabled={pending} name={name} value={value}>
      {pending ? (pendingText ?? "Saving…") : children}
    </button>
  );
}
