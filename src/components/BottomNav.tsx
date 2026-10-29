"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/browse", label: "Browse", match: ["/browse", "/athletes"] },
  { href: "/requests", label: "Requests", match: ["/requests"] },
  { href: "/chats", label: "Chats", match: ["/chats"] },
  { href: "/me", label: "Me", match: ["/me"] },
];

export function BottomNav({ badges }: { badges: Partial<Record<string, number>> }) {
  const pathname = usePathname();
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
                className={`relative flex h-14 items-center justify-center text-xs font-semibold uppercase tracking-wider ${
                  active ? "text-accent" : "text-muted hover:text-fg"
                }`}
              >
                {tab.label}
                {badge ? (
                  <span className="ml-1.5 inline-grid min-w-5 place-items-center bg-accent px-1 text-[0.65rem] leading-5 text-accent-ink">
                    {badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
