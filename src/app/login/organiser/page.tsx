import { redirect } from "next/navigation";

/**
 * Old organiser sign-in address. Everyone now uses the one sign-in page,
 * which sends each person to their own home; this keeps old links working.
 */
export default async function OrganiserLoginPage({ searchParams }: PageProps<"/login/organiser">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? `&next=${encodeURIComponent(params.next)}` : "";
  redirect(`/login?door=organiser${next}`);
}
