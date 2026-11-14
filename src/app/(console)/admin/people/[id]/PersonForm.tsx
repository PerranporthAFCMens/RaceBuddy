"use client";
import { useActionState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { moderatePerson } from "../../actions";

/** Warn, suspend, ban or reinstate someone without a report. Every action is logged. */
export function PersonForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(moderatePerson, undefined);
  return (
    <ActionForm action={action} className="space-y-3">
      <input type="hidden" name="user_id" value={userId} />
      <label className="block">
        <span className="field-label">Action</span>
        <select className="input" name="action" required defaultValue="">
          <option value="" disabled>
            Choose…
          </option>
          <option value="warn">Warn</option>
          <option value="suspend">Suspend</option>
          <option value="ban">Ban (close account, block their email)</option>
          <option value="reinstate">Reinstate</option>
          <option value="note">Add a note only</option>
        </select>
      </label>
      <label className="block">
        <span className="field-label">Note for the log (why)</span>
        <textarea className="input min-h-20" name="note" required minLength={5} maxLength={1000} />
      </label>
      <label className="block">
        <span className="field-label">Message they will see (warn or suspend, optional)</span>
        <textarea className="input min-h-16" name="message" maxLength={500} />
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">Save</SubmitButton>
    </ActionForm>
  );
}
