/** Event details. Owners get these fields; the site admin also gets organiser, short name and visibility. */
export function EventFields({
  event,
  admin,
}: {
  event?: {
    name: string;
    venue: string | null;
    starts_on: string;
    ends_on: string;
    ticket_url: string | null;
    name_change_cutoff: string | null;
  };
  admin?: { organisers: { id: string; name: string }[]; organiserId?: string; slug?: string; isActive?: boolean };
}) {
  return (
    <>
      {admin && (
        <label className="block">
          <span className="field-label">Organiser</span>
          <select className="input" name="organiser_id" required defaultValue={admin.organiserId ?? ""}>
            <option value="" disabled>
              Choose…
            </option>
            {admin.organisers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block">
        <span className="field-label">Event name</span>
        <input className="input" name="name" required minLength={2} maxLength={80} defaultValue={event?.name} />
      </label>
      {admin && (
        <label className="block">
          <span className="field-label">Short name (lower case, dashes, used in links)</span>
          <input className="input" name="slug" required maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={admin.slug} />
        </label>
      )}
      <label className="block">
        <span className="field-label">Venue</span>
        <input className="input" name="venue" maxLength={120} defaultValue={event?.venue ?? ""} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="field-label">First day</span>
          <input className="input" name="starts_on" type="date" required defaultValue={event?.starts_on} />
        </label>
        <label className="block">
          <span className="field-label">Last day</span>
          <input className="input" name="ends_on" type="date" required defaultValue={event?.ends_on} />
        </label>
      </div>
      <label className="block">
        <span className="field-label">Ticket link</span>
        <input className="input" name="ticket_url" type="url" placeholder="https://" defaultValue={event?.ticket_url ?? ""} />
      </label>
      <label className="block">
        <span className="field-label">Name-change cutoff (optional)</span>
        <input className="input" name="name_change_cutoff" type="date" defaultValue={event?.name_change_cutoff ?? ""} />
      </label>
      {admin && (
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={admin.isActive ?? false} className="size-5 accent-accent" />
          Show this event to athletes
        </label>
      )}
    </>
  );
}
