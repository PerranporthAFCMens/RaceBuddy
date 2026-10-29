import Link from "next/link";

export function Logo({ size = "sm", href = "/" }: { size?: "sm" | "lg"; href?: string | null }) {
  const mark = (
    <span
      className={
        size === "lg"
          ? "inline-block text-4xl font-bold leading-none tracking-[0.32em] sm:text-6xl"
          : "inline-block text-sm font-bold leading-none tracking-[0.22em]"
      }
      aria-label="Race Buddy"
    >
      RACE BUDD<b className="font-display font-normal tracking-normal text-accent text-[1.2em]">Y</b>
    </span>
  );
  return href ? <Link href={href}>{mark}</Link> : mark;
}
