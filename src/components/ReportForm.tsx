"use client";
import { useActionState } from "react";
import { reportUser } from "@/app/(app)/safety/actions";
import { ActionForm } from "@/components/ActionForm";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { REPORT_CATEGORIES } from "@/lib/safety";

/** Report a person, a chat or a single message. */
export function ReportForm({
  people,
  conversationId,
  messageId,
}: {
  people: { id: string; name: string }[];
  conversationId?: string;
  messageId?: string;
}) {
  const [state, formAction] = useActionState(reportUser, undefined);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <ActionForm action={formAction} className="space-y-3">
      {conversationId && <input type="hidden" name="conversation_id" value={conversationId} />}
      {messageId && <input type="hidden" name="message_id" value={messageId} />}
      {messageId ? null : people.length === 1 ? (
        <input type="hidden" name="user_id" value={people[0]!.id} />
      ) : (
        <label className="block">
          <span className="field-label">Who</span>
          <select className="input" name="user_id">
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block">
        <span className="field-label">What&apos;s wrong?</span>
        <select className="input" name="category" required defaultValue="">
          <option value="" disabled>
            Choose…
          </option>
          {REPORT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="field-label">Anything else we should know? (optional)</span>
        <textarea className="input min-h-20" name="reason" maxLength={1000} />
      </label>
      <p className="text-xs text-muted">
        {messageId ? "We'll see this message and the few before it. " : ""}
        If you&apos;re in danger, call 999.
      </p>
      <FormMessage state={state} />
      <SubmitButton className="btn-line w-full" pendingText="Sending…">
        Send report
      </SubmitButton>
    </ActionForm>
  );
}
