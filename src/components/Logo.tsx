import Link from "next/link";
import { brand } from "@/design/brand";

/**
 * Wordmark. Text comes from src/design/brand.ts, so it follows a rename.
 * `meaning` adds what the name stands for underneath (on by default for the
 * big logo; leave it off in compact headers).
 */
export function Logo({
  size = "sm",
  href = "/",
  meaning = size === "lg",
}: {
  size?: "sm" | "lg";
  href?: string | null;
  meaning?: boolean;
}) {
  const word = (
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
  const mark = meaning ? (
    <span className="inline-flex flex-col items-center gap-2">
      {word}
      <span className={size === "lg" ? "text-sm uppercase tracking-brand" : "text-2xs uppercase tracking-brand"}>{brand.meaning}</span>
    </span>
  ) : (
    word
  );
  return href ? <Link href={href}>{mark}</Link> : mark;
}
