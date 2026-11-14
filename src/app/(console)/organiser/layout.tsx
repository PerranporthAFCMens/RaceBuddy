/**
 * Event owner console. Each page checks the person runs the organiser or event
 * (anyone else gets "not found", or a short note on the home page).
 */
export default function OrganiserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">Event console</p>
      {children}
    </div>
  );
}
