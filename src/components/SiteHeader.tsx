import { Logo } from "@/components/Logo";
import { AccountMenu } from "@/components/AccountMenu";
import { AREA_HOME, areasFor, type Area, type Roles } from "@/lib/roles";

const AREA_LABEL: Record<Area, string | null> = { admin: "Admin", organiser: "Organiser", racer: null };

/**
 * The one header for every signed-in screen: the logo (goes to the start of
 * the area you're in), which area that is, and the account menu.
 */
export function SiteHeader({ roles, area, wide = false }: { roles: Roles; area: Area | null; wide?: boolean }) {
  const label = area ? AREA_LABEL[area] : null;
  return (
    <header className="sticky top-0 z-20 border-b border-edge bg-bg pt-[env(safe-area-inset-top)]">
      <div className={`mx-auto flex h-12 items-center justify-between gap-3 px-4 ${wide ? "max-w-5xl" : "max-w-xl"}`}>
        <div className="flex items-center gap-3">
          <Logo href={area ? AREA_HOME[area] : AREA_HOME.racer} />
          {label && (
            <span className="border border-edge px-1.5 py-0.5 text-xs uppercase tracking-widest text-muted">{label}</span>
          )}
        </div>
        <AccountMenu email={roles.email} areas={areasFor(roles)} current={area} />
      </div>
    </header>
  );
}
