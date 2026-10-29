"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const ICONS: Record<string, React.ReactNode> = {
  "/browse": (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  "/requests": (
    <>
      <path d="M4 6h16v12H4z" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  "/chats": <path d="M4 5h16v11H9l-5 4z" />,
  "/me": (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
    </>
  ),
};

const TABS = [
  { href: "/browse", label: "Browse", match: ["/browse", "/athletes"] },
  { href: "/requests", label: "Requests", match: ["/requests"] },
  { href: "/chats", label: "Chats", match: ["/chats"] },
  { href: "/me", label: "Me", match: ["/me"] },
];

export function BottomNav({ badges }: { badges: Partial<Record<string, number>> }) {
  const pathname = usePathname();
  const params = useSearchParams();
  // First-time set-up runs without tabs, so people finish it.
  if (params.get("welcome") === "1" && pathname.startsWith("/me")) return null;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-edge bg-bg pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {TABS.map((tab) => {
          const active = tab.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
          const badge = badges[tab.href];
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-14 flex-col items-center justify-center gap-1 text-2xs font-semibold uppercase tracking-wider ${
                  active ? "text-accent" : "text-muted hover:text-fg"
                }`}
              >
                <span className="relative">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth={1.8} aria-hidden>
                    {ICONS[tab.href]}
                  </svg>
                  {badge ? (
                    <span className="badge absolute -top-1.5 left-3.5">
                      {badge}
                      <span className="sr-only"> new</span>
                    </span>
                  ) : null}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
