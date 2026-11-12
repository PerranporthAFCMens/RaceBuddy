# 2026-11-04: Chat upgrade

Adam tested chat on the dev site and asked for a first-class chat: reactions
and a better look and feel.

What changed on the chat screen:
- Top bar stays put while you scroll; the message box stays above the tabs.
- Messages grouped by person (5 minute gap), one time per group, day
  dividers ("Today", "Yesterday", "Mon 3 Nov"). UK times on server and phone.
- Tap (or long-press) a message for 👍 ❤️ 😂 🔥 💪 🙌, Reply and Copy.
  Reactions show under the message with counts; tap one to add or remove yours.
- Reply: a quote of the original sits on top of the reply.
- "Sam is typing…" (Supabase broadcast, nothing stored) and "Seen" / "Seen by
  …" under your latest message (from `last_read_at`, live).
- Sending shows straight away; a failed message gets "Try again". The box
  grows with your text; Enter sends on a keyboard (phones keep Enter for new
  lines). Web links get an "Open <site>" link under the message.
- "N new messages ↓" when you've scrolled up and something arrives.
- The screen now loads the latest 300 messages (it was loading the oldest 300).
- Bottom-bar counts also refresh when you read a chat.

Database (`20261104200000_chat_reactions_replies.sql`, rollback in
`supabase/rollback/`): `messages.reply_to_id` (same chat only, checked by a
trigger); `message_reactions` table (fixed emoji set, one of each per person
per message, chat taken from the message, 60 a minute limit, members only,
remove only your own); adds `message_reactions`, `conversation_members` and
`partner_requests` to the realtime feed. Only adds things, so main's code is
unaffected. Must be run before this reaches the dev site, or reactions and
replies fail (plain messages still work).

Parts live in `src/components/chat/ChatParts.tsx` (shown on /styleguide);
helpers and tests in `src/lib/chat.ts`.
