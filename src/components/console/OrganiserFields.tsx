import type { AdminOrganiser } from "@/lib/admin";

/** Name, short name and website, for adding or editing an organiser. */
export function OrganiserFields({ organiser }: { organiser?: AdminOrganiser }) {
  return (
    <>
      {organiser && <input type="hidden" name="organiser_id" value={organiser.id} />}
      <label className="block">
        <span className="field-label">Name</span>
        <input className="input" name="name" required maxLength={80} defaultValue={organiser?.name} />
      </label>
      <label className="block">
        <span className="field-label">Short name (lower case, dashes, used in links)</span>
        <input className="input" name="slug" required maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={organiser?.slug} />
      </label>
      <label className="block">
        <span className="field-label">Website (optional)</span>
        <input className="input" name="website_url" type="url" placeholder="https://" defaultValue={organiser?.website_url ?? ""} />
      </label>
    </>
  );
}
