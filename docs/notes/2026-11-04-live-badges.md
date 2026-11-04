# 2026-11-04: Bottom-bar counts update by themselves

Adam found that a new request or message only showed its count on the bottom
bar after a reload or page change. The app layout renders once, so the counts
it worked out went stale.

- `src/lib/badges.ts`: one function for the counts (requests waiting for you,
  chats with unread messages), used by the server layout and the browser.
- `BottomNav` re-checks the counts when a message arrives (live), when you
  change page, when you come back to the tab or app, and every 30 seconds.
- It also listens for request changes, but `partner_requests` is not in the
  live (realtime) feed yet, so requests rely on the other triggers for now.
  The chat upgrade migration adds it.
