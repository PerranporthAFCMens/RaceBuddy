"use client";
import { useActionState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { moderateReport, viewEvidence } from "../../actions";

/** Message evidence stays hidden until the admin gives a reason (logged). */
export function EvidenceViewer({ reportId, count }: { reportId: string; count: number }) {
  const [state, action] = useActionState(viewEvidence, undefined);
  if (count === 0) return <p className="text-sm text-muted">No messages were kept with this report.</p>;
  if (state?.rows)
    return (
      <ol className="space-y-2">
        {state.rows.map((r, i) => (
          <li key={i} className={`border p-3 text-sm ${r.is_reported ? "border-danger" : "border-edge"}`}>
            <p className="text-xs uppercase tracking-wide text-muted">
              {r.sender_name ?? "Deleted account"} · {new Date(r.sent_at).toLocaleString("en-GB", { timeZone: "Europe/London" })}
              {r.is_reported ? " · reported" : ""}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words">{r.body}</p>
          </li>
        ))}
      </ol>
    );
  return (
    <ActionForm action={action} className="space-y-3">
      <input type="hidden" name="report_id" value={reportId} />
      <label className="block">
        <span className="field-label">Why do you need to see them? (logged)</span>
        <input className="input" name="reason" required minLength={5} maxLength={500} />
      </label>
      <FormMessage state={state?.error ? { error: state.error } : undefined} />
      <SubmitButton className="btn-line w-full" pendingText="Loading…">
        Show {count} kept messages
      </SubmitButton>
    </ActionForm>
  );
}

export function ModerateForm({ reportId, canActOnPerson }: { reportId: string; canActOnPerson: boolean }) {
  const [state, action] = useActionState(moderateReport, undefined);
  return (
    <ActionForm action={action} className="space-y-3">
      <input type="hidden" name="report_id" value={reportId} />
      <label className="block">
        <span className="field-label">Decision</span>
        <select className="input" name="action" required defaultValue="">
          <option value="" disabled>
            Choose…
          </option>
          <option value="review">Mark as being reviewed</option>
          <option value="dismiss">Dismiss: nothing wrong</option>
          <option value="resolve">Resolve: dealt with, no account action</option>
          {canActOnPerson && <option value="warn">Warn the person</option>}
          {canActOnPerson && <option value="suspend">Suspend the person</option>}
          <option value="ban">Ban the person (close account, block their email)</option>
          {canActOnPerson && <option value="reinstate">Reinstate the person</option>}
          <option value="note">Add a note only</option>
        </select>
      </label>
      <label className="block">
        <span className="field-label">Note for the log (why)</span>
        <textarea className="input min-h-20" name="note" maxLength={1000} />
      </label>
      <label className="block">
        <span className="field-label">Message they will see (warn or suspend, optional)</span>
        <textarea className="input min-h-16" name="message" maxLength={500} />
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">Save decision</SubmitButton>
    </ActionForm>
  );
}
