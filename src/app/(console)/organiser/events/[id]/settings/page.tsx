import { brand } from "@/design/brand";
import { EventFields } from "@/components/console/EventFields";
import { StateForm } from "@/components/console/StateForm";
import { requireOwnedEvent } from "@/lib/owner";
import { updateEvent } from "../../../actions";

export const metadata = { title: "Event settings" };

export default async function OwnerEventSettings({ params }: PageProps<"/organiser/events/[id]/settings">) {
  const { id } = await params;
  const { event } = await requireOwnedEvent(id);
  return (
    <div className="space-y-3">
      <StateForm action={updateEvent} submit="Save settings">
        <input type="hidden" name="event_id" value={event.id} />
        <EventFields event={event} />
      </StateForm>
      <p className="text-xs text-muted">
        To add an event, add categories, or show or hide an event from athletes, contact {brand.name}.
      </p>
    </div>
  );
}
