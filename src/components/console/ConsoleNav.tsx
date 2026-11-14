"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Tabs across the top of a console section. The first tab only matches its own page. */
export function ConsoleNav({ label, items }: { label: string; items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto border-b border-edge px-4 pb-3">
      {items.map((item, i) => {
        const on = i === 0 ? path === item.href : path === item.href || path.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={`chip min-h-11 shrink-0 ${on ? "chip-on" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
