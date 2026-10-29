"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types";

export function Chat({
  conversationId,
  me,
  names,
  initial,
  canSend,
}: {
  conversationId: string;
  me: string;
  names: Record<string, string>;
  initial: Message[];
  canSend: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initial);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  // Live updates: new messages appear, and lock-in changes refresh the panel.
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lockins", filter: `conversation_id=eq.${conversationId}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase, router]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
    supabase
      .from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", me)
      .then(() => undefined);
  }, [messages.length, conversationId, me, supabase]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: me, body })
      .select()
      .single();
    setSending(false);
    if (error) {
      setError("Message not sent. Please try again.");
      return;
    }
    setDraft("");
    setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Message]));
  }

  return (
    <div className="flex flex-col gap-2">
      {messages.length === 0 && <p className="py-6 text-center text-sm text-muted">Say hello and plan a training session.</p>}
      {messages.map((m) => {
        const mine = m.sender_id === me;
        return (
          <div key={m.id} className={`max-w-[82%] ${mine ? "self-end" : "self-start"}`}>
            {!mine && Object.keys(names).length > 1 && (
              <p className="mb-0.5 text-[0.65rem] uppercase tracking-wider text-muted">{names[m.sender_id] ?? "Athlete"}</p>
            )}
            <p className={`whitespace-pre-wrap break-words px-3 py-2 text-sm ${mine ? "bg-accent text-accent-ink" : "bg-soft"}`}>
              {m.body}
            </p>
          </div>
        );
      })}
      <div ref={bottom} />
      {canSend ? (
        <form
          onSubmit={send}
          className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] -mx-4 mt-2 flex gap-2 border-t border-edge bg-bg px-4 py-3"
        >
          <label className="sr-only" htmlFor="chat-input">
            Message
          </label>
          <input
            id="chat-input"
            className="input flex-1"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message…"
            maxLength={2000}
            autoComplete="off"
          />
          <button className="btn-gold" disabled={sending || !draft.trim()}>
            Send
          </button>
        </form>
      ) : (
        <p className="mt-2 text-center text-sm text-muted">You can&apos;t send messages in this chat.</p>
      )}
      {error && <p className="text-center text-sm text-danger">{error}</p>}
    </div>
  );
}
