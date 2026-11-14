"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type MenuArea = { area: string; label: string; href: string };

/**
 * The account button at the top right of every signed-in screen: who you're
 * signed in as, the areas you can switch to, and Sign out.
 * `startOpen` is for the styleguide only.
 */
export function AccountMenu({
  email,
  areas,
  current,
  startOpen = false,
}: {
  email: string | null;
  areas: MenuArea[];
  current: string | null;
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const box = useRef<HTMLDivElement>(null);
  const path = usePathname();
  const [seenPath, setSeenPath] = useState(path);
  // Close after moving to another page.
  if (seenPath !== path) {
    setSeenPath(path);
    setOpen(false);
  }

  useEffect(() => {
    if (!open || startOpen) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, startOpen]);

  const initial = (email?.[0] ?? "?").toUpperCase();
  return (
    <div ref={box} className={startOpen ? "relative min-h-80" : "relative"}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="account-menu"
        aria-label="Account menu"
        onClick={() => setOpen(!open)}
        className="grid h-11 w-11 place-items-center"
      >
        <span className="grid h-8 w-8 place-items-center border border-line text-sm font-bold" aria-hidden>
          {initial}
        </span>
      </button>
      {open && (
        <div id="account-menu" className="absolute right-0 top-12 z-30 w-64 border border-line bg-panel text-sm">
          <p className="border-b border-edge px-4 py-3 text-xs text-muted">
            Signed in as <span className="block break-all text-fg">{email ?? "your account"}</span>
          </p>
          {areas.length > 1 && (
            <ul className="border-b border-edge py-1" aria-label="Switch to">
              {areas.map((a) => (
                <li key={a.area}>
                  <Link
                    href={a.href}
                    aria-current={a.area === current ? "page" : undefined}
                    className={`flex min-h-11 items-center px-4 ${a.area === current ? "font-bold text-accent" : "hover:bg-soft"}`}
                  >
                    {a.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/safety" className="flex min-h-11 items-center px-4 hover:bg-soft">
            Safety tips
          </Link>
          <form action="/auth/signout" method="post">
            <button className="flex min-h-11 w-full items-center px-4 text-left hover:bg-soft">Sign out</button>
          </form>
        </div>
      )}
    </div>
  );
}
