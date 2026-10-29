# Phase 21 journeys — Inbox redesign

superseded: the list header, row, thread card and right icon-rail parts of phase 10 and phase 11 Inbox journeys, and the always-docked customer panel. Reply-at-end-of-thread (JRN-218) stays.

### JRN-232 Calm list
- steps: Open Inbox at 1440.
- expected: Header shows "Inbox" with search and + buttons. Tabs read "Needs you 7 · AI handling 128 · Done" with a "Views" menu, plus one sort/filter row. Rows have two lines (name + time, then subject) with an unread dot, red time when overdue, no chips, icons or avatars, and no pagination footer.

### JRN-233 Switch tabs and views
- steps: Click AI handling, then Done, then Needs you. Open Views and pick a saved view. Hover a row and tick 2 checkboxes.
- expected: The list changes per tab. The saved view applies and its name shows in the tab row. Checkboxes appear on hover and the bulk bar shows.

### JRN-234 Light thread
- steps: Open GB-1076 (Margaret, Fedora arrived crushed).
- expected: The header shows the subject, "Margaret Okonkwo · email · #GB20398", the assignee avatar, Resolve, Customer and ⋯. The top line reads "✦ AI handed this over: …" with Details. Messages have no boxes: AI messages are softly tinted with the author "AI", internal notes are soft yellow, and events are small centred lines. The AI draft card sits at the end with Approve & send, Edit and Write my own.

### JRN-235 Customer on demand
- steps: Click Customer. Switch to Ask AI. Press `]`. Reload.
- expected: The panel opens with identity, 3 stats, the latest order with View in Shopify, Loop returns and past tickets, and Ask AI shows the Q&A. `]` closes it, and after reload it stays closed.

### JRN-236 Phone
- steps: At 390 open Inbox, tap a ticket, open Customer, go back.
- expected: A full-screen list with tabs, then a full-screen thread with a back arrow and a docked composer. The customer panel is a bottom sheet. No sideways scroll.
