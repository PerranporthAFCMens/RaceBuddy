import { SiteHeader } from "@/components/SiteHeader";
import { requireUser } from "@/lib/data";
import { getRoles } from "@/lib/roles";

/**
 * Organiser view. Each page checks the person runs the organiser or event
 * (anyone else gets the "Wrong account" page, or a short note on the home page).
 */
export default async function OrganiserLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const roles = (await getRoles())!;
  return (
    <>
      <SiteHeader roles={roles} area="organiser" wide />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 pt-5 pb-10">{children}</main>
    </>
  );
}
