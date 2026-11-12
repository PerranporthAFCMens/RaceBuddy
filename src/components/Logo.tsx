import Link from "next/link";
import { brand } from "@/design/brand";

/** Wordmark. Text comes from src/design/brand.ts, so it follows a rename. */
export function Logo({ size = "sm", href = "/" }: { size?: "sm" | "lg"; href?: string | null }) {
  const mark = (
    <span
      className={
        size === "lg"
          ? "inline-block font-display text-3xl leading-none tracking-widest sm:text-5xl"
          : "inline-block font-display text-sm leading-none tracking-widest"
      }
      aria-label={brand.name}
    >
      {brand.wordmark.lead}
      <span className="text-accent">{brand.wordmark.accent}</span>
    </span>
  );
  return href ? <Link href={href}>{mark}</Link> : mark;
}
