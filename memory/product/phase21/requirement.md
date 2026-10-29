# Phase 21 — Inbox redesign: calmer, easier to navigate

Version: phase-21 · Speed mode (UI skin; visuals first, simple mock behaviour)

## Goal
The user wants the Inbox "more intuitive and easy to navigate, less busy". Decisions confirmed with the user:
- A simplified 3-panel layout: ticket list, conversation, and customer info that opens on demand.
- Two-line ticket rows.
- Simple tabs at the top of the list.
- A light chat-style thread with no message boxes, where AI and internal notes are softly tinted.

Existing features stay reachable but move out of sight until needed. Frontend-only, mocks through `/src/api`.

## Functional requirements

### Ticket list (left, ~340px)
- REQ-1026 [always] The list header shall show "Inbox", a search icon button and a "+" new-ticket icon button. The stats line ("128 by AI today · 7 need you · 9 in progress") is removed.
- REQ-1027 [always] Under the header, tabs shall read "Needs you 7 · AI handling 128 · Done", with counts as quiet numbers and the active tab underlined.
- REQ-1028 [always] Saved views (private or shared) and their create/edit shall move into a "Views" menu at the right end of the tab row.
- REQ-1029 [always] One slim row under the tabs shall hold "Sort: Waiting longest ▾" and a filter icon. The filter popover holds channel, assignee and tag.
- REQ-1030 [always] Each ticket row shall have two lines. Line 1 shows the customer name (bold when unread) with the time at the right. Line 2 shows the subject, truncated and muted. There are no tag chips, channel icons, summary lines or avatars in the row.
- REQ-1031 [state] While a ticket is waiting past its target, the time shall show in the warm red; otherwise it is muted.
- REQ-1032 [always] An unread ticket shall show a small dot left of the name. The selected row has a soft tinted background.
- REQ-1033 [state] While the pointer is over a row, or a selection exists, a checkbox shall appear at the left. Selecting rows shows the existing bulk bar.
- REQ-1034 [always] The list shall scroll continuously. The pagination footer is removed.
- REQ-1035 [state] While "Needs you" is empty, the list shall show "You're all caught up" with "See what AI is handling".

### Conversation (centre)
- REQ-1036 [always] The conversation header shall show the subject on line 1 and "Customer name · email or chat · #order" muted on line 2.
- REQ-1037 [always] The header's right side shall show only an assignee avatar button, "Resolve" (primary), a "Customer" toggle button and a "⋯" menu. The menu holds Snooze, Tags, Priority, Previous/Next ticket and Copy link.
- REQ-1038 [always] The status chip, separate snooze icon, prev/next arrows and the right-hand icon rail shall be removed from view. J/K still move between tickets.
- REQ-1039 [always] Messages shall be light chat style with no boxes or borders: a 28px avatar, name, muted time, then the text. Customer and agent messages have no background.
- REQ-1040 [always] AI messages shall show the author "AI" with a sparkle avatar and a very soft warm tint (#FAF7F2), without the "AI" pill or "Created by…" footer. "Why?" appears on hover and shows the reasoning.
- REQ-1041 [always] Internal notes shall have a very soft yellow tint (#FFF8E6) with a small "Internal note" label.
- REQ-1042 [always] System events (escalated, workflow handover, assigned) shall be single small muted centred lines, with consecutive events merged into one line separated by "·".
- REQ-1043 [always] The handoff brief shall be one compact line at the top of the thread with the soft orange glow: "✦ AI handed this over: <reason>" plus "Details". Details expands to what the AI checked and the suggested next step.
- REQ-1044 [always] The AI draft shall be the only card in the thread, at the end. Its header line reads "✦ AI draft · 58%", followed by the draft text (first 3 lines, then "Show all"), and the actions Approve & send (primary), Edit and a "Write my own" text link.
- REQ-1045 [always] The composer shall be a minimal box with a Reply / Note toggle. Its formatting toolbar appears only while focused.
- REQ-1046 [always] The thread shall use a centred reading column of max 760px.

### Customer info (right, on demand)
- REQ-1047 [always] The customer panel shall be closed by default. "Customer" in the header or the `]` key opens and closes it as a 360px panel. The state is remembered.
- REQ-1048 [always] The customer panel shall have "Customer" and "Ask AI" tabs.
- REQ-1049 [always] The Customer tab shall show the identity (name, email, location, tags), 3 stats (orders, spend, return rate), the latest order card with "View in Shopify", the Loop returns summary and past tickets, all in light sections without heavy cards.
- REQ-1050 [always] The Ask AI tab shall hold the existing "Ask Goorin AI" Q&A.

### Responsive
- REQ-1051 [state] While the screen is 1024–1279px wide, the customer panel shall open as an overlay sheet.
- REQ-1052 [state] While on a phone, the list shall be full screen with the tabs at the top. Opening a ticket shows the full-screen conversation with a back arrow, the customer panel is a bottom sheet, and the composer stays docked.

## Quality requirements
```
Q-878  Tag: Inbox.Calm
       Scale: count of distinct controls visible in the conversation header + list header at 1440
       Meter: count on screenshot
       Must: ≤ 9 (was ~16)
       Plan: ≤ 8
Q-879  Tag: Inbox.Look
       Scale: user judgement "intuitive, easy to navigate, less busy"
       Meter: human review of shots (1440 list+thread, customer open, phone)
       Must: no message boxes except the AI draft; two-line rows
       Plan: user approves
```
