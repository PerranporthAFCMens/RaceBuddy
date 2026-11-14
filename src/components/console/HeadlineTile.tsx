import Link from "next/link";

/** The one number that leads a console page, in gold, with a line on what it means. */
export function HeadlineTile({
  label,
  value,
  note,
  href,
  action,
}: {
  label: string;
  value: number | string | undefined;
  note: string;
  href?: string;
  action?: string;
}) {
  const body = (
    <>
      <span className="block font-display text-5xl leading-none text-accent">{value ?? "–"}</span>
      <span className="mt-2 block text-sm font-bold uppercase tracking-wider">{label}</span>
      <span className="mt-1 block text-sm text-muted">{note}</span>
      {href && action && <span className="mt-3 block text-sm underline">{action}</span>}
    </>
  );
  return href ? (
    <Link href={href} className="block border border-accent p-4 hover:bg-soft">
      {body}
    </Link>
  ) : (
    <div className="border border-accent p-4">{body}</div>
  );
}
