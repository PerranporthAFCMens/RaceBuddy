"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DayDivider, MessageBubble, ReplyBar, TypingLine } from "@/components/chat/ChatParts";
import { ReportForm } from "@/components/ReportForm";
import { findLinks, layoutMessages, seenBy, snippet, summariseReactions, timeLabel, type ReactionRow } from "@/lib/chat";
import { BLOCKED_WORD_TEXT, isBlockedWordError } from "@/lib/safety";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types";

type Status = "sent" | "sending" | "failed";
type ChatMessage = Message & { status?: Status };
type Member = { user_id: string; last_read_at: string };

/** Tell others you're typing at most this often, and forget a typist after this long. */
const TYPING_SEND_MS = 2500;
const TYPING_SHOW_MS = 4500;

/** A stand-in id for something not saved yet. */
let counter = 0;
const tempId = () => `temp-${++counter}`;
const nowIso = () => new Date().toISOString();

export function Chat({
  conversationId,
  me,
  names,
  initial,
  initialReactions,
  initialMembers,
  canSend,
}: {
  conversationId: string;
  me: string;
  names: Record<string, string>;
  initial: Message[];
  initialReactions: ReactionRow[];
  /** Everyone else in the chat and when they last read it. */
  initialMembers: Member[];
  canSend: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [reactions, setReactions] = useState<ReactionRow[]>(initialReactions);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [typing, setTyping] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(0);
  const bottom = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSent = useRef(0);
  const atBottomRef = useRef(true);

  const nameOf = useCallback((uid: string) => (uid === me ? "You" : (names[uid] ?? "Athlete")), [me, names]);
  const isTeam = Object.keys(names).length > 1;

  const scrollToEnd = useCallback((smooth = false) => {
    bottom.current?.scrollIntoView({ block: "end", behavior: smooth ? "smooth" : "auto" });
    setUnseen(0);
  }, []);

  // Live updates: messages, reactions, "Seen", typing, and lock-in changes.
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          setTyping((t) => {
            if (!(msg.sender_id in t)) return t;
            const next = { ...t };
            delete next[msg.sender_id];
            return next;
          });
          if (msg.sender_id !== me && !atBottomRef.current) setUnseen((n) => n + 1);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reactions", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const r = payload.new as ReactionRow;
          setReactions((prev) =>
            prev.some((x) => x.id === r.id || (x.message_id === r.message_id && x.user_id === r.user_id && x.emoji === r.emoji))
              ? prev.map((x) => (x.message_id === r.message_id && x.user_id === r.user_id && x.emoji === r.emoji ? r : x))
              : [...prev, r],
          );
        },
      )
      // Removals can't be filtered by chat; they only carry the row id.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "message_reactions" }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id) setReactions((prev) => prev.filter((x) => x.id !== id));
      })
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_members", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as Member;
          if (row.user_id === me) return;
          setMembers((prev) => prev.map((m) => (m.user_id === row.user_id ? { ...m, last_read_at: row.last_read_at } : m)));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lockins", filter: `conversation_id=eq.${conversationId}` },
        () => router.refresh(),
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const uid = (payload as { user_id?: string }).user_id;
        if (uid && uid !== me && uid in names) setTyping((t) => ({ ...t, [uid]: Date.now() + TYPING_SHOW_MS }));
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase, router, me, names]);

  // Forget typists who went quiet.
  useEffect(() => {
    if (Object.keys(typing).length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setTyping((t) => {
        const next = Object.fromEntries(Object.entries(t).filter(([, until]) => until > now));
        return Object.keys(next).length === Object.keys(t).length ? t : next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [typing]);

  // Know whether you're at the bottom, to decide whether to jump on new messages.
  useEffect(() => {
    const el = bottom.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      atBottomRef.current = entry.isIntersecting;
      setAtBottom(entry.isIntersecting);
      if (entry.isIntersecting) setUnseen(0);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Start at the latest message.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, []);

  // Follow new messages when you're at the bottom (or sent one), and mark the chat read.
  const lastId = messages.at(-1)?.id;
  const lastMine = messages.at(-1)?.sender_id === me;
  useEffect(() => {
    if (atBottomRef.current || lastMine) scrollToEnd(true);
    supabase
      .from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", me)
      .then(() => undefined);
  }, [lastId, lastMine, conversationId, me, supabase, scrollToEnd]);

  // Close the message menu on Escape or a tap elsewhere.
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element).closest(`[data-message="${openId}"]`)) setOpenId(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [openId]);

  // Grow the message box with its text, up to about six lines.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [draft]);

  async function deliver(temp: ChatMessage) {
    setError(null);
    const row: Record<string, string> = { conversation_id: conversationId, sender_id: me, body: temp.body };
    if (temp.reply_to_id) row.reply_to_id = temp.reply_to_id;
    const { data, error } = await supabase.from("messages").insert(row).select().single();
    if (error) {
      setMessages((prev) => prev.map((m) => (m.id === temp.id ? { ...m, status: "failed" } : m)));
      if (error.message.startsWith("Slow down")) setError(error.message);
      else if (isBlockedWordError(error.message)) setError(BLOCKED_WORD_TEXT);
      return;
    }
    const sent = data as Message;
    setMessages((prev) => {
      const withoutTemp = prev.filter((m) => m.id !== temp.id);
      return withoutTemp.some((m) => m.id === sent.id) ? withoutTemp : [...withoutTemp, sent];
    });
  }

  function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = draft.trim();
    if (!body) return;
    const temp: ChatMessage = {
      id: tempId(),
      conversation_id: conversationId,
      sender_id: me,
      body,
      created_at: nowIso(),
      reply_to_id: replyTo?.id ?? null,
      status: "sending",
    };
    setMessages((prev) => [...prev, temp]);
    setDraft("");
    setReplyTo(null);
    lastTypingSent.current = 0;
    box.current?.focus();
    void deliver(temp);
  }

  function retry(m: ChatMessage) {
    const again: ChatMessage = { ...m, id: tempId(), created_at: nowIso(), status: "sending" };
    setMessages((prev) => [...prev.filter((x) => x.id !== m.id), again]);
    void deliver(again);
  }

  function onDraft(value: string) {
    setDraft(value);
    const now = Date.now();
    if (value.trim() && now - lastTypingSent.current > TYPING_SEND_MS && channelRef.current) {
      lastTypingSent.current = now;
      void channelRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: me } });
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // On a keyboard, Enter sends and Shift+Enter adds a line. Phones keep Enter for new lines.
    const touch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    if (e.key === "Enter" && !e.shiftKey && !touch && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  async function toggleReaction(messageId: string, emoji: string) {
    setOpenId(null);
    if (messageId.startsWith("temp-")) return;
    const existing = reactions.find((r) => r.message_id === messageId && r.user_id === me && r.emoji === emoji);
    if (existing) {
      setReactions((prev) => prev.filter((r) => r.id !== existing.id));
      const { error } = await supabase.from("message_reactions").delete().eq("id", existing.id);
      if (error) setReactions((prev) => [...prev, existing]);
      return;
    }
    const temp: ReactionRow = { id: tempId(), message_id: messageId, user_id: me, emoji };
    setReactions((prev) => [...prev, temp]);
    const { data, error } = await supabase
      .from("message_reactions")
      .insert({ message_id: messageId, conversation_id: conversationId, emoji })
      .select("id, message_id, user_id, emoji")
      .single();
    if (error) {
      setReactions((prev) => prev.filter((r) => r.id !== temp.id));
      setError(error.message.startsWith("Slow down") ? error.message : "Couldn't add that reaction. Please try again.");
      return;
    }
    const saved = data as ReactionRow;
    setReactions((prev) => {
      const rest = prev.filter((r) => r.id !== temp.id && r.id !== saved.id);
      return [...rest, saved];
    });
  }

  async function copy(body: string) {
    setOpenId(null);
    try {
      await navigator.clipboard.writeText(body);
      setNotice("Copied");
    } catch {
      setNotice("Couldn't copy on this device");
    }
    setTimeout(() => setNotice(null), 2000);
  }

  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const rows = useMemo(() => layoutMessages(messages), [messages]);
  const latestMineSent = [...messages].reverse().find((m) => m.sender_id === me && (m.status ?? "sent") === "sent");
  const typingNames = Object.keys(typing).map((uid) => names[uid] ?? "Someone");

  function seenLabel(m: ChatMessage) {
    if (m.id !== latestMineSent?.id) return null;
    const who = seenBy(m.created_at, members);
    if (who.length === 0) return null;
    if (!isTeam) return "Seen";
    return who.length === members.length ? "Seen by everyone" : `Seen by ${who.map((u) => names[u] ?? "Athlete").join(", ")}`;
  }

  return (
    <div className="flex flex-col">
      {messages.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">Say hello and plan a training session.</p>
      )}

      <div role="log" aria-label="Messages" aria-live="polite" className="flex flex-col">
        {rows.map((row) => {
          if (row.kind === "day") return <DayDivider key={row.key} label={row.label} />;
          const m = row.message;
          const mine = m.sender_id === me;
          const original = m.reply_to_id ? byId.get(m.reply_to_id) : undefined;
          const mineSeen = seenLabel(m);
          const summary = summariseReactions(
            reactions.filter((r) => r.message_id === m.id),
            me,
          ).map((r) => ({
            emoji: r.emoji,
            count: r.count,
            mine: r.mine,
            names: r.who.map((u) => nameOf(u)).join(", "),
          }));
          return (
            <div key={row.key} data-message={m.id} className="flex flex-col">
              <MessageBubble
                body={m.body}
                mine={mine}
                first={row.first}
                name={!mine && isTeam && row.first ? nameOf(m.sender_id) : null}
                time={row.last || mineSeen ? timeLabel(m.created_at) : null}
                seen={mineSeen}
                reply={
                  m.reply_to_id
                    ? original
                      ? { name: nameOf(original.sender_id), text: snippet(original.body) }
                      : { name: "Earlier message", text: "Not loaded" }
                    : null
                }
                reactions={summary}
                links={findLinks(m.body)}
                status={m.status ?? "sent"}
                open={openId === m.id}
                onToggle={canSend && !m.id.startsWith("temp-") ? () => setOpenId((id) => (id === m.id ? null : m.id)) : undefined}
                onReact={(emoji) => void toggleReaction(m.id, emoji)}
                onReply={() => {
                  setReplyTo(m);
                  setOpenId(null);
                  box.current?.focus();
                }}
                onCopy={() => void copy(m.body)}
                onReport={
                  mine
                    ? undefined
                    : () => {
                        setReportId(m.id);
                        setOpenId(null);
                      }
                }
                onRetry={() => retry(m)}
              />
              {reportId === m.id && (
                <div className="mt-2 space-y-3 border border-line bg-panel p-3">
                  <p className="text-sm font-semibold">Report this message from {nameOf(m.sender_id)}</p>
                  <ReportForm messageId={m.id} people={[]} />
                  <button type="button" onClick={() => setReportId(null)} className="btn-ghost w-full">
                    Close
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <TypingLine names={typingNames} />
      </div>
      <div ref={bottom} className="h-px" />

      {!atBottom && unseen > 0 && (
        <div className="pointer-events-none sticky bottom-[calc(8rem+env(safe-area-inset-bottom))] z-10 flex justify-center">
          <button type="button" onClick={() => scrollToEnd(true)} className="btn-gold pointer-events-auto px-4">
            {unseen === 1 ? "1 new message" : `${unseen} new messages`} ↓
          </button>
        </div>
      )}

      {canSend ? (
        <form
          onSubmit={send}
          className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] -mx-4 mt-3 space-y-2 border-t border-edge bg-bg px-4 py-3"
        >
          {replyTo && (
            <ReplyBar name={nameOf(replyTo.sender_id)} text={snippet(replyTo.body)} onCancel={() => setReplyTo(null)} />
          )}
          {(error || notice) && (
            <p role="status" className={`text-center text-sm ${error ? "text-danger" : "text-muted"}`}>
              {error ?? notice}
            </p>
          )}
          <div className="flex items-end gap-2">
            <label className="sr-only" htmlFor="chat-input">
              Message
            </label>
            <textarea
              id="chat-input"
              ref={box}
              rows={1}
              className="input min-h-11 flex-1 resize-none py-2.5"
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Message…"
              maxLength={2000}
              autoComplete="off"
              enterKeyHint="send"
            />
            <button className="btn-gold shrink-0" disabled={!draft.trim()}>
              Send
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-4 text-center text-sm text-muted">You can&apos;t send messages in this chat.</p>
      )}
    </div>
  );
}
