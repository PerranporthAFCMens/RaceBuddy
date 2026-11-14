import { requireOwner } from "@/lib/owner";

/** Event owner console. Anyone who doesn't run an organiser gets "not found". */
export default async function OrganiserLayout({ children }: { children: React.ReactNode }) {
  await requireOwner();
  return (
    <div className="space-y-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">Event console</p>
      {children}
    </div>
  );
}
