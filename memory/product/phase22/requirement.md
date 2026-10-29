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

### Premium polish (user: "needs a little more polish, make more modern and premium")
- REQ-1075 [always] The Inbox work area (list or ticket + customer panel) shall sit on one white rounded surface (radius 16px, soft shadow, 8px inset from the warm canvas). The folder column sits directly on the canvas without a border. (interpreted)
- REQ-1076 [always] The active folder shall be a white pill with a soft shadow on the canvas. Counts are tabular and muted, and the Needs you count stays a small brown badge.
- REQ-1077 [always] The list header shall read "Needs you" with a muted count and one toolbar (search, sort, filter as ghost icon buttons).
- REQ-1078 [always] List rows shall be grouped under quiet headers "Overdue · n" and "Today · n" (and "Earlier"), with tabular times and a softer overdue red. (interpreted)
- REQ-1079 [always] The handover summary shall be a white card with a soft warm glow and a small "Handover" label, replacing the solid yellow block.
- REQ-1080 [always] Message bubbles shall be tighter (radius 16px, 12–14px padding, hairline borders, AI tint #F5F8FC), with "Show reasoning" as a small quiet link.
- REQ-1081 [always] The composer shall be a floating rounded box with a soft shadow at the end of the thread.
- REQ-1082 [always] In the customer panel, section chevrons shall sit on the right, field dropdown chevrons show only on hover, dividers are hairline, and "Customer | Ask AI" is a segmented control.
- REQ-1083 [always] Hovers, panel opens and list↔ticket switches shall use subtle 150–200ms transitions.

### Right panel with an icon rail (user: "right side bar should be easily opened and collapsed and look more like <Gorgias panel>")
- REQ-1084 [always] The ticket view shall show a 52px icon rail at the far right edge, always visible on desktop. From top to bottom it holds:
  - the panel toggle (open/close)
  - Customer (person-list icon)
  - Shopify (logo)
  - Loop Returns ("LR" badge)
  - Ask AI (sparkle)
  - a divider
  - Panel settings (gear)
- REQ-1085 [event] When the user clicks the toggle or presses `]`, the panel shall slide open or closed (200ms), with the rail staying put. The state is remembered.
- REQ-1086 [event] When the user clicks Customer, Shopify or Loop while the panel is closed, it shall open. The panel then scrolls to that section with a brief highlight, and the active icon gets a soft filled tile.
- REQ-1087 [event] When the user clicks Ask AI, the panel shall show the Ask AI view. Clicking Customer returns to the details view.
- REQ-1088 [event] When the user clicks the gear, a popover shall list the panel sections with show/hide switches. (mock, remembered)
- REQ-1089 [always] The panel content shall follow the inspiration, calmer:
  - Ticket details: tag icon title + chevron, tags as chips with coloured dots and ×, "+" button, "+N ▾" overflow, collapsible "Ticket fields".
  - Customer: avatar + name + search + ⋯ + chevron, label/value rows for Email (link colour), Phone ("+ Add") and Note, collapsible "Customer fields".
  - Tickets: an "N tickets" chip with a "Show all ›" outline button, then the latest past-ticket card.
  - Shopify: logo + "Shopify" + store selector (goorin-bros), the customer link with an external icon, Created at, and tags as chips with "+".
  - Metafields: an empty note.
  - Purchase summary: number of orders and amount.
  - Orders: count chip, "+ Create order" and order cards.
  - Loop returns.
- REQ-1090 [state] While the screen is narrower than 1280px, the rail shall stay visible and the panel opens as an overlay sheet beside it. The Ask AI tab inside the panel is replaced by the rail icon.

## Quality
```
Q-880  Tag: Inbox.Fit
       Scale: conversation column width at 1440 with folders + list visible and customer panel closed
       Meter: screenshot measure
       Must: ≥ 640px
       Plan: ≥ 720px
```
