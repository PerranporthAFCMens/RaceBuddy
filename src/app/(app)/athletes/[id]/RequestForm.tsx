"use client";
import { useActionState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { sendRequest } from "./actions";

export function RequestForm({ entryId, isTeam, firstName }: { entryId: string; isTeam: boolean; firstName: string }) {
  const [state, action] = useActionState(sendRequest, undefined);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="entry_id" value={entryId} />
      <label className="block">
        <span className="field-label">Add a note (optional)</span>
        <textarea
          className="input min-h-20"
          name="note"
          maxLength={280}
          placeholder={isTeam ? "I can cover the SkiErg and row." : `Hi ${firstName}, I'm free Saturday!`}
        />
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingText="Sending…">{isTeam ? "Ask to join the team" : "Partner up"}</SubmitButton>
    </form>
  );
}
