"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type ConsoleNavItem = { href: string; label: string; group?: string };

/**
 * Tabs across the top of a console section. The first tab only matches its
 * own page. Items with a `group` get a small label before the first of them,
 * so related tabs read as one set (e.g. "Safety: Reports, People").
 */
export function ConsoleNav({ label, items }: { label: string; items: ConsoleNavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label={label} className="-mx-4 flex items-center gap-2 overflow-x-auto border-b border-edge px-4 pb-3">
      {items.map((item, i) => {
        const on = i === 0 ? path === item.href : path === item.href || path.startsWith(`${item.href}/`);
        const startsGroup = item.group && item.group !== items[i - 1]?.group;
        return (
          <span key={item.href} className="flex shrink-0 items-center gap-2">
            {startsGroup && (
              <span className={`text-xs uppercase tracking-widest text-muted ${i > 0 ? "ml-2" : ""}`}>{item.group}</span>
            )}
            <Link href={item.href} aria-current={on ? "page" : undefined} className={`chip min-h-11 ${on ? "chip-on" : ""}`}>
              {item.label}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
