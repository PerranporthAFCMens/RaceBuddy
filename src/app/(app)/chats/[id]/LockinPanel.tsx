"use client";
import { useActionState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { cancelLockin, proposeLockin, respondToLockin } from "./actions";

export type LockinView =
  | { kind: "propose"; partners: { id: string; name: string }[]; isTeam: boolean }
  | { kind: "waiting"; lockinId: string; partnerName: string }
  | { kind: "confirm"; lockinId: string; proposerName: string }
  | { kind: "done"; names: string[]; cutoff: string | null; ticketUrl: string | null; isHolder: boolean }
  | { kind: "none"; reason: string };

function NameAndConsent() {
  return (
    <>
      <label className="block">
        <span className="field-label">Your full name (for the start list)</span>
        <input className="input" name="full_name" autoComplete="name" required minLength={3} maxLength={80} />
      </label>
      <label className="flex items-start gap-3 text-xs text-muted">
        <input type="checkbox" name="consent" required className="mt-0.5 h-5 w-5 accent-accent" />
        I agree to share my full name with the race organiser so they can update the start list.
      </label>
    </>
  );
}

export function LockinPanel({ conversationId, view }: { conversationId: string; view: LockinView }) {
  const [proposeState, proposeAction] = useActionState(proposeLockin, undefined);
  const [respondState, respondAction] = useActionState(respondToLockin, undefined);

  if (view.kind === "none") return null;

  if (view.kind === "done") {
    return (
      <section className="space-y-2 border border-ok p-3">
        <p className="text-sm font-bold uppercase tracking-wide text-ok">Locked in</p>
        <p className="text-sm">{view.names.join(" and ")} are a team. You both show as Matched.</p>
        {view.isHolder && (
          <p className="text-xs text-muted">
            Next: the ticket holder completes the name change with the organiser
            {view.cutoff ? ` before ${new Date(`${view.cutoff}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}.
            Paying the fee in Race Buddy is coming soon.
            {view.ticketUrl && (
              <>
                {" "}
                <a href={view.ticketUrl} target="_blank" rel="noreferrer" className="text-accent underline">
                  Ticket page
                </a>
              </>
            )}
          </p>
        )}
      </section>
    );
  }

  if (view.kind === "waiting") {
    return (
      <section className="space-y-2 border border-accent p-3">
        <p className="text-sm">Waiting for {view.partnerName} to confirm the lock-in.</p>
        <form action={cancelLockin}>
          <input type="hidden" name="lockin_id" value={view.lockinId} />
          <input type="hidden" name="conversation_id" value={conversationId} />
          <SubmitButton className="btn-ghost w-full text-xs" pendingText="…">
            Cancel
          </SubmitButton>
        </form>
      </section>
    );
  }

  if (view.kind === "confirm") {
    return (
      <section className="space-y-3 border border-accent p-3">
        <p className="text-sm font-bold uppercase tracking-wide text-accent">{view.proposerName} wants to lock you in</p>
        <ActionForm action={respondAction} className="space-y-3">
          <input type="hidden" name="lockin_id" value={view.lockinId} />
          <input type="hidden" name="conversation_id" value={conversationId} />
          <NameAndConsent />
          <FormMessage state={respondState} />
          <div className="grid grid-cols-2 gap-2">
            <SubmitButton name="answer" value="accept" className="btn-gold" pendingText="…">
              Lock in
            </SubmitButton>
            <button
              name="answer"
              value="decline"
              formNoValidate
              className="btn-line"
            >
              Not yet
            </button>
          </div>
        </ActionForm>
      </section>
    );
  }

  return (
    <details className="border border-accent">
      <summary className="cursor-pointer px-3 py-2 text-sm font-bold uppercase tracking-wide text-accent">
        {view.isTeam ? "Lock in a team member" : `Lock in ${view.partners[0]?.name ?? "your partner"}`}
      </summary>
      <ActionForm action={proposeAction} className="space-y-3 p-3 pt-1">
        <input type="hidden" name="conversation_id" value={conversationId} />
        {view.partners.length === 1 ? (
          <input type="hidden" name="partner_id" value={view.partners[0]!.id} />
        ) : (
          <label className="block">
            <span className="field-label">Who are you locking in?</span>
            <select className="input" name="partner_id" required>
              {view.partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <p className="text-xs text-muted">They&apos;ll be asked to confirm. Once they do, you both show as Matched.</p>
        <NameAndConsent />
        <FormMessage state={proposeState} />
        <SubmitButton pendingText="Sending…">Lock in partner</SubmitButton>
      </ActionForm>
    </details>
  );
}

export function ReportForm({
  conversationId,
  people,
  action,
}: {
  conversationId: string;
  people: { id: string; name: string }[];
  action: (state: { ok?: boolean; error?: string; message?: string } | undefined, fd: FormData) => Promise<{ ok?: boolean; error?: string; message?: string } | undefined>;
}) {
  const [state, formAction] = useActionState(action, undefined);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <ActionForm action={formAction} className="space-y-3">
      <input type="hidden" name="conversation_id" value={conversationId} />
      {people.length === 1 ? (
        <input type="hidden" name="user_id" value={people[0]!.id} />
      ) : (
        <select className="input" name="user_id">
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      <textarea className="input min-h-20" name="reason" placeholder="What happened?" maxLength={1000} required />
      <FormMessage state={state} />
      <SubmitButton className="btn-line w-full" pendingText="Sending…">
        Send report
      </SubmitButton>
    </ActionForm>
  );
}
