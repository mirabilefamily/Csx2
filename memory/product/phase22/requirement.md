# Phase 22 — Inbox folder sidebar

Version: phase-22 · Speed mode (UI skin)

## Goal
The user asked for a sidebar and folder view in the Inbox. Confirmed choices:
- A folder column inside the Inbox, left of the ticket list.
- Core folders only.
- The folders replace the list tabs.
- The main app sidebar shrinks to icons on the Inbox and can still be expanded.

## Functional requirements
- REQ-1053 [always] The Inbox shall show a folder column (~220px) left of the ticket list, headed "Inbox" with a "+" new-ticket button.
- REQ-1054 [always] The folder column shall list Needs you, AI handling, Assigned to me, Unassigned, Snoozed, Done and All, each with an icon and a quiet count on the right (Done and All show no count).
- REQ-1055 [event] When the user clicks a folder, the system shall show that folder's tickets in the list, highlight the folder, and update the URL (for example /inbox?folder=unassigned). (no failure mode)
- REQ-1056 [always] The Needs you count shall show as a small filled badge. All other counts are plain muted numbers.
- REQ-1057 [always] The list tabs (Needs you · AI handling · Done) and the Views menu shall be removed. The list header shows the folder name, a search icon and the sort/filter row.
- REQ-1058 [always] Under the core folders, the folder column shall show collapsible "Shared views" and "Private views" sections (collapsed by default) listing saved views, plus "+ New view". (from the user's inspiration screenshot)
- REQ-1059 [always] Opening the Inbox shall NOT collapse the main app sidebar. It keeps the user's normal state (goorin.sidebar.collapsed). (user follow-up "do not collapse side bar for inbox"; replaces the auto-collapse)
- REQ-1060 [state] While the screen is 1024–1279px wide, the folder column shall collapse to a 56px icon strip with tooltips and counts as dots, and a toggle expands it as an overlay.
- REQ-1061 [state] While on a phone, the folders shall be a full-screen list (the first Inbox screen). Tapping a folder opens its ticket list with a back arrow.
- REQ-1062 [always] Empty folders shall show a calm empty state ("Nothing in Snoozed", "You're all caught up" for Needs you).

### Inspiration follow-up ("here is some inspo, just make it better")
- REQ-1063 [always] The folder column header shall show "Inbox", a search icon and a collapse-column icon, then a "New ticket" button with the shortcut hint "N". Core folders sit under a quiet "Folders" label.
- REQ-1064 [state] While the screen is narrower than 1680px, opening a ticket shall replace the ticket list with the ticket view (folders + ticket). The ticket header shows a breadcrumb "<Folder> › <Customer> › <Subject>"; the folder crumb returns to the list. Prev/next arrows and J/K move through the folder.
- REQ-1065 [state] While the screen is 1680px wide or more, the list shall stay visible beside the open ticket.
- REQ-1066 [state] While no ticket is open, the ticket list shall use the full main area with two-line rows, and the right side of each row shows the assignee avatar and status dot.
- REQ-1067 [always] The ticket header right side shall show an assignee picker with name, "Resolve", "⋯" (Team, Snooze, Tags, Priority, Copy link) and prev/next arrows.
- REQ-1068 [always] Customer messages shall sit left, and AI and agent messages right (max ~80% width), as softly tinted blocks without heavy borders. AI blocks are a very light cool tint; internal notes are soft yellow.
- REQ-1069 [always] AI messages shall show a visible "Show reasoning ▾" toggle, and AI handoffs a right-aligned event line "Handed over by ✦ AI".
- REQ-1070 [always] On Needs you tickets, a "Handover summary" block (soft yellow) shall show "Intent: <intent>", a bold one-line ask, and 2–3 bullets of what the AI checked, each with a small source icon. It collapses with a chevron, and when newer messages exist it shows "New messages since this summary · Refresh".
- REQ-1071 [always] The composer shall show a "To: <name> (<email>)" line with a channel picker (Email / Chat / Internal note) above the reply box, with placeholder "Reply, or press R".
- REQ-1072 [always] The customer panel shall be open by default in the ticket view at 1280px and wider, closable and remembered. Its collapsible sections are:
  - Ticket details: tag chips with "+", plus ticket fields Contact reason, Resolution and Product.
  - Customer: email, phone, Note "+ Add".
  - Past tickets: cards, then "Show all".
  - Shopify: customer link, created date, "Add tags".
  - Purchase summary: orders count, amount.
  - Orders: order cards with item thumbnails, Paid / Fulfilled chips, and Edit / Duplicate / Refund mock actions.
  - Loop returns.
  - It keeps the "Ask AI" tab.
- REQ-1073 [always] Past-ticket cards shall show a mail/chat icon, subject, relative time, "Contact reason · Resolution" (+N more), a status chip (Open / Closed), the assignee and the message count. The current ticket is highlighted.
- REQ-1074 [event] When the user clicks "Show all" on past tickets, the system shall open a "<Customer> Timeline" side sheet with sort and filter icons, a "Tickets" filter chip and the full list of ticket cards.

## Quality
```
Q-880  Tag: Inbox.Fit
       Scale: conversation column width at 1440 with folders + list visible and customer panel closed
       Meter: screenshot measure
       Must: ≥ 640px
       Plan: ≥ 720px
```
