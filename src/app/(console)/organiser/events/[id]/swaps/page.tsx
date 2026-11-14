import { ukTime } from "@/lib/admin";
import { requireOwnedEvent, type OwnerLockin } from "@/lib/owner";

export const metadata = { title: "Swaps" };

/** Confirmed lock-ins: the full names both athletes agreed to share, for the start list. */
export default async function OwnerSwapsPage({ params }: PageProps<"/organiser/events/[id]/swaps">) {
  const { id } = await params;
  const { supabase, event } = await requireOwnedEvent(id);
  const { data } = await supabase.rpc("owner_lockins", { p_event: event.id });
  const rows = (data as OwnerLockin[] | null) ?? [];
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Teams that locked in a new partner. Both athletes agreed to share these names so you can update your start list. Name
        changes and any fee are between them and you.
      </p>
      {rows.length === 0 ? (
        <p className="text-center text-sm text-muted">No locked-in teams yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.lockin_id} className="card p-3">
              <p className="font-bold uppercase">
                {r.proposer_full_name ?? "Name not given"} + {r.partner_full_name ?? "name not given"}
              </p>
              <p className="text-sm">
                {r.category_name ?? "No category"}
                {r.team_name ? ` · ${r.team_name}` : ""}
              </p>
              <p className="text-xs text-muted">Locked in {ukTime(r.confirmed_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
