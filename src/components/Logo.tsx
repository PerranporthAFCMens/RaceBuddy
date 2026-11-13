import Link from "next/link";
import { Arrows } from "@/components/Arrows";
import { brand } from "@/design/brand";

/**
 * Wordmark. Text comes from src/design/brand.ts, so it follows a rename.
 * `meaning` adds what the name stands for underneath (on by default for the
 * big logo; leave it off in compact headers). `arrows` puts the brand's two
 * forward arrows in front of the name (on by default; the home page turns it
 * off because it shows big arrows above the logo instead).
 */
export function Logo({
  size = "sm",
  href = "/",
  meaning = size === "lg",
  arrows = true,
}: {
  size?: "sm" | "lg";
  href?: string | null;
  meaning?: boolean;
  arrows?: boolean;
}) {
  const name = (
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
  const word = arrows ? (
    <span className={size === "lg" ? "inline-flex items-center gap-3" : "inline-flex items-center gap-1.5"}>
      <Arrows className={size === "lg" ? "h-6 w-7 sm:h-10 sm:w-11" : "h-3 w-3.5"} />
      {name}
    </span>
  ) : (
    name
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
