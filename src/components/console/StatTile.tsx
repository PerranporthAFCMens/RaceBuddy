import Link from "next/link";

/** One number on a console overview. With `href`, the whole tile is a link. */
export function StatTile({ label, value, href }: { label: string; value: number | string | undefined; href?: string }) {
  const body = (
    <>
      <span className="block font-display text-2xl">{value ?? "–"}</span>
      <span className="block text-xs uppercase tracking-wider text-muted">{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className="card block p-3 hover:border-fg">
      {body}
    </Link>
  ) : (
    <div className="card p-3">{body}</div>
  );
}
