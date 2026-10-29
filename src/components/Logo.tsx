import Link from "next/link";
import { brand } from "@/design/brand";

/** Placeholder wordmark while the product name is under review. Text comes from src/design/brand.ts. */
export function Logo({ size = "sm", href = "/" }: { size?: "sm" | "lg"; href?: string | null }) {
  const mark = (
    <span
      className={
        size === "lg"
          ? "inline-block text-4xl font-bold leading-none tracking-brand sm:text-6xl"
          : "inline-block text-sm font-bold leading-none tracking-brand"
      }
      aria-label={brand.name}
    >
      {brand.wordmark.lead}
      <b className="font-display font-normal tracking-normal text-accent">{brand.wordmark.accent}</b>
    </span>
  );
  return href ? <Link href={href}>{mark}</Link> : mark;
}
