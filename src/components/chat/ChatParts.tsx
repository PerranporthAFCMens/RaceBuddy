"use client";
/**
 * Building blocks of a chat: day dividers, message bubbles with reactions and
 * reply quotes, and the "typing" line. They only draw; the chat screen
 * (src/app/(app)/chats/[id]/Chat.tsx) owns the data. Shown on /styleguide.
 */
import { REACTIONS } from "@/lib/chat";

export function DayDivider({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-3" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-edge" aria-hidden />
      <span className="text-2xs font-semibold uppercase tracking-wider text-muted" suppressHydrationWarning>
        {label}
      </span>
      <span className="h-px flex-1 bg-edge" aria-hidden />
    </div>
  );
}

export type BubbleReaction = { emoji: string; count: number; mine: boolean; names: string };

export type BubbleProps = {
  body: string;
  mine: boolean;
  /** Shown above the first message of a group in team chats. */
  name?: string | null;
  /** Shown under the last message of a group. */
  time?: string | null;
  /** "Seen" or "Seen by Tom", under your latest message. */
  seen?: string | null;
  reply?: { name: string; text: string } | null;
  reactions?: BubbleReaction[];
  links?: { href: string; label: string }[];
  status?: "sent" | "sending" | "failed";
  /** The reaction and reply menu is open. */
  open?: boolean;
  /** First in a group: a little more space above. */
  first?: boolean;
  onToggle?: () => void;
  onReact?: (emoji: string) => void;
  onReply?: () => void;
  onCopy?: () => void;
  onRetry?: () => void;
};

export function MessageBubble({
  body,
  mine,
  name,
  time,
  seen,
  reply,
  reactions = [],
  links = [],
  status = "sent",
  open = false,
  first = true,
  onToggle,
  onReact,
  onReply,
  onCopy,
  onRetry,
}: BubbleProps) {
  const side = mine ? "items-end" : "items-start";
  const meta = [time, status === "sending" ? "Sending…" : null, status === "sent" ? seen : null].filter(Boolean).join(" · ");
  return (
    <div className={`flex flex-col ${side} ${first ? "mt-3" : "mt-0.5"}`}>
      {name && <p className="mb-1 text-2xs font-semibold uppercase tracking-wider text-muted">{name}</p>}
      <button
        type="button"
        onClick={onToggle}
        onContextMenu={(e) => {
          if (!onToggle) return;
          e.preventDefault();
          onToggle();
        }}
        aria-expanded={open}
        className={`block min-h-11 max-w-[85%] whitespace-pre-wrap break-words px-3.5 py-2.5 text-left text-base select-text ${
          mine ? "bg-accent text-accent-ink" : "bg-soft text-fg"
        } ${status === "sending" ? "opacity-70" : ""} ${open ? "outline outline-2 outline-offset-2 outline-fg" : ""}`}
      >
        {reply && (
          <span
            className={`mb-1.5 block border-l-2 pl-2 text-sm ${mine ? "border-accent-ink" : "border-accent text-muted"}`}
          >
            <span className="block font-semibold">{reply.name}</span>
            <span className="block">{reply.text}</span>
          </span>
        )}
        {body}
        <span className="sr-only">{open ? "" : ". Tap for reactions and reply."}</span>
      </button>

      {links.length > 0 && (
        <div className={`flex max-w-[85%] flex-wrap gap-x-4 ${mine ? "justify-end" : ""}`}>
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-4"
            >
              Open {l.label}
            </a>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-1 border border-line bg-panel" role="group" aria-label="Message options">
          <div className="flex">
            {REACTIONS.map((emoji) => {
              const done = reactions.some((r) => r.emoji === emoji && r.mine);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact?.(emoji)}
                  aria-pressed={done}
                  aria-label={`React ${emoji}`}
                  className={`grid h-11 w-11 place-items-center text-xl ${done ? "bg-accent" : "hover:bg-soft"}`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 border-t border-edge">
            <button type="button" onClick={onReply} className="h-11 text-xs font-semibold uppercase tracking-wide hover:bg-soft">
              Reply
            </button>
            <button
              type="button"
              onClick={onCopy}
              className="h-11 border-l border-edge text-xs font-semibold uppercase tracking-wide hover:bg-soft"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {reactions.length > 0 && (
        <div className={`-mt-1 -mb-1.5 flex flex-wrap gap-1 ${mine ? "justify-end" : ""}`}>
          {reactions.map((r) => (
            <button
              key={r.emoji}
              type="button"
              onClick={() => onReact?.(r.emoji)}
              aria-pressed={r.mine}
              aria-label={`${r.emoji} ${r.count}: ${r.names}`}
              title={r.names}
              className="flex min-h-11 items-center"
            >
              <span
                className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-sm ${
                  r.mine ? "border-accent bg-panel text-fg" : "border-line bg-bg text-fg"
                }`}
              >
                <span aria-hidden>{r.emoji}</span>
                <span className="text-xs font-semibold">{r.count}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {status === "failed" ? (
        <p className="flex items-center gap-2 text-xs text-danger">
          Not sent.
          <button type="button" onClick={onRetry} className="min-h-11 font-semibold uppercase tracking-wide underline">
            Try again
          </button>
        </p>
      ) : (
        meta && (
          <p className="mt-1 text-2xs text-muted" suppressHydrationWarning>
            {meta}
          </p>
        )
      )}
    </div>
  );
}

export function TypingLine({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  const who = names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} and ${names[1]}` : "Several people";
  return (
    <p className="mt-3 text-xs text-muted" aria-live="polite">
      {who} {names.length === 1 ? "is" : "are"} typing…
    </p>
  );
}

export function ReplyBar({ name, text, onCancel }: { name: string; text: string; onCancel?: () => void }) {
  return (
    <div className="flex items-center gap-2 border-l-2 border-accent bg-panel pl-3">
      <p className="min-w-0 flex-1 py-1.5 text-sm">
        <span className="block text-xs font-semibold uppercase tracking-wide text-accent">Replying to {name}</span>
        <span className="block truncate text-muted">{text}</span>
      </p>
      <button type="button" onClick={onCancel} className="grid h-11 w-11 place-items-center text-muted hover:text-fg" aria-label="Cancel reply">
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth={1.8} aria-hidden>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
