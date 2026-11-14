import { redirect } from "next/navigation";
import { requireUser } from "@/lib/data";
import { getRoles, homeFor } from "@/lib/roles";

/**
 * Where sign-in lands when no page was asked for: the admin console for
 * the admin, the organiser view for organisers, Browse for racers (who are
 * sent on to build a profile if they haven't yet).
 */
export default async function StartPage() {
  await requireUser();
  redirect(homeFor(await getRoles()));
}
