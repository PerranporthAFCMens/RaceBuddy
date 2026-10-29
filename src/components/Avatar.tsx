import { initials, photoUrl } from "@/lib/format";

export function Avatar({
  name,
  path,
  size = 48,
  className = "",
}: {
  name: string;
  path: string | null;
  size?: number;
  className?: string;
}) {
  const url = photoUrl(path);
  const style = { width: size, height: size };
  if (url) {
    // Plain <img>: photos come from Supabase storage and are already small.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" style={style} className={`shrink-0 object-cover ${className}`} />;
  }
  return (
    <span
      style={style}
      className={`grid shrink-0 place-items-center bg-linear-to-br from-edge to-panel text-sm font-bold text-muted ${className}`}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
