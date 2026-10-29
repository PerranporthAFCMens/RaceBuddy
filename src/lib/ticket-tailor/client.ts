import "server-only";

const BASE = "https://api.tickettailor.com/v1";

function authHeader() {
  const key = process.env.TICKET_TAILOR_API_KEY;
  if (!key) throw new Error("TICKET_TAILOR_API_KEY is not set.");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

async function ttGet<T>(path: string): Promise<{ status: number; body: T | null }> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: authHeader(), Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 404) return { status: 404, body: null };
  if (!res.ok) throw new Error(`Ticket Tailor returned ${res.status}`);
  return { status: res.status, body: (await res.json()) as T };
}

// Only the fields we use. Personal data on KeltX's key is masked anyway.
type TTOrder = {
  id: string;
  status?: string;
  event_id?: string;
  event_summary?: { id?: string; event_id?: string } | null;
  issued_tickets?: { ticket_type_id?: string; status?: string; event_id?: string }[];
};

export type TicketCheck =
  | { ok: true }
  | { ok: false; reason: "not_found" | "wrong_event" | "cancelled" | "wrong_category" };

/**
 * Checks an order reference without reading anyone's personal details:
 * the order exists, is for this event, isn't cancelled, and holds a valid
 * ticket of the chosen category.
 */
export async function checkOrder(params: {
  orderId: string;
  ttEventId: string;
  ttTicketTypeId: string;
}): Promise<TicketCheck> {
  const { body: order } = await ttGet<TTOrder>(`/orders/${encodeURIComponent(params.orderId)}`);
  if (!order) return { ok: false, reason: "not_found" };

  const tickets = order.issued_tickets ?? [];
  const eventIds = new Set(
    [order.event_id, order.event_summary?.id, order.event_summary?.event_id, ...tickets.map((t) => t.event_id)].filter(
      Boolean,
    ),
  );
  if (!eventIds.has(params.ttEventId)) return { ok: false, reason: "wrong_event" };

  const status = (order.status ?? "").toLowerCase();
  if (["cancelled", "refunded", "voided", "void"].includes(status)) return { ok: false, reason: "cancelled" };

  const valid = tickets.some(
    (t) => t.ticket_type_id === params.ttTicketTypeId && (t.status ?? "valid").toLowerCase() === "valid",
  );
  if (!valid) return { ok: false, reason: "wrong_category" };
  return { ok: true };
}
