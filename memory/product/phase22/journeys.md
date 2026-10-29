# Phase 22 journeys — Inbox folders

superseded: the tabs part of [JRN-232] and [JRN-233] (phase 21), and the "sidebar stays open on Inbox" behaviour from phase 11

### JRN-237 Folder column
- steps: Open Inbox at 1440 from Dashboard, with the app sidebar expanded.
- expected: The app sidebar keeps its normal state (no auto-collapse). A folder column shows Needs you (badge 7), AI handling, Assigned to me, Unassigned, Snoozed, Done and All, with icons and counts. The list header shows "Needs you", with no tabs or Views menu. The conversation is at least 640px wide.

### JRN-238 Switch folders
- steps: Click Unassigned, Snoozed, Done, then All.
- expected: The list and header change each time, the folder is highlighted and the URL updates. Snoozed shows "Nothing in Snoozed" if empty.

### JRN-239 Sidebar stays put
- steps: With the app sidebar expanded, open the Inbox, then Dashboard, then the Inbox again.
- expected: The sidebar never collapses by itself.

### JRN-240 Saved views + responsive
- steps: Open the filter popover. Then view at 1024 and 390.
- expected: The popover has Saved views and "Save current filters as view". At 1024 the folders become an icon strip with an overlay toggle. At 390 folders are the first screen, tapping one opens its list with a back arrow, and there's no sideways scroll.

### JRN-241 List ↔ ticket with breadcrumb (1440)
- steps: At 1440 open Inbox. Click Margaret Okonkwo. Click the "Needs you" crumb. Open a ticket again and use the next arrow.
- expected: The list fills the main area until a ticket opens. The ticket view then shows folders + ticket + customer panel, with the breadcrumb "Needs you › Margaret Okonkwo › Fedora arrived crushed…". The crumb returns to the list, and next moves to the next ticket in the folder.

### JRN-242 Thread like the inspiration, but calmer
- steps: Look at GB-1076.
- expected: Margaret's messages are on the left, and AI and agent messages on the right in soft tints. The AI message has "Show reasoning ▾" and a "Handed over by ✦ AI" line. A yellow Handover summary shows the intent, ask and bullets, and collapses. The composer shows "To: Margaret Okonkwo (margaret.okonkwo@example.com)" with a channel picker. The AI draft still sits at the end.

### JRN-243 Customer panel + timeline
- steps: Look at the right panel. Collapse and expand Orders. Click "Show all" on past tickets.
- expected: The sections are Ticket details (tags, fields), Customer, Past tickets (cards with status, assignee and messages), Shopify, Purchase summary, Orders (thumbnails, Paid/Fulfilled, Edit/Duplicate/Refund) and Loop returns. "Show all" opens the "Margaret Okonkwo Timeline" sheet with sort/filter, a Tickets chip and cards, with the current ticket highlighted.
