# Phase 15: AI & Workflows design pass (requirement)

- Phase version: phase-15
- Goal: improve all 4 AI & Workflows pages (Brand voice, AI replies, Workflows (list and editor), Conversation testing) so they feel modern, premium and organized, in the same family as the refreshed Inbox, Dashboard and Channels. Routing is removed (REQ-805). Everything stays MOCKED.
- User request: "improve all 4 pages on AI & Workflows". There was no further direction, so the details below are interpreted from a review of the current 1440 screenshots.
- Shared rules: app tokens only; the "AI" wording (REQ-776); one sticky save bar style; inputs capped (text 480, number 120, select 280); 24px card padding; sentence-case 15px section titles; count badges; no heavy beige fills.

## Functional requirements

### Page shell
- REQ-806 [always] The system shall show the tabs Brand voice · AI replies · Workflows · Conversation testing, keep the subtitle, and give each tab a one-line intro under the tabs that says what it controls (interpreted).

### Brand voice
- REQ-807 [always] The system shall lay out Brand voice as a settings column (≤720px) plus a sticky right "Voice preview" card.
- REQ-808 [always] The system shall group the fields into cards:
  - Identity: brand name, and Voice on/off in the card header.
  - Tone: tone preset chips (Warm, Concise, Playful, Formal, Old-world craft) that append to the textarea, plus the tone textarea with its counter.
  - How to respond: textarea with counter.
  - Words: "Use" and "Avoid" chip inputs.
  - Sign-off.
- REQ-809 [always] The system shall show in the Voice preview card a sample customer message (with a selector for 3 samples: sizing, late order, damaged item) and the mock AI reply rewritten with the current draft voice. It updates live as fields change (debounced) and has a "Test this voice" button that opens Conversation testing with the draft (interpreted).
- REQ-810 [always] The system shall fold "Where it applies" and "Style, never policy" into one compact "How brand voice works" info card under the preview.

### AI replies
- REQ-811 [always] The system shall show an impact strip at the top: "AI resolved 78%", "Handed to a person 22%", "Auto-sent replies <n>", "Auto-refunds <n> · $<x>" (last 30 days, mock).
- REQ-812 [always] The system shall show Confidence threshold as a slider with an inline value chip and a live estimate: "At <x>%, about <y>% of last month's replies would send on their own." The zone labels read "Hand to backup AI" and "AI answers" (no "Claude").
- REQ-813 [always] The system shall show Auto-send as a clean channel × tier table (rows Email and Chat; columns "AI" and "Backup AI (Grokbot)") with switches and one-line helper text.
- REQ-814 [always] The system shall keep Auto-refunds (toggle, max amount $ input 120px, fraud note) in the same 2-column section pattern.
- REQ-815 [always] (superseded by REQ-827) The system shall show the Grokbot fallback as a status row: the Grokbot logo or bot tile, a status pill ("Error · 401 Unauthorized" in red), the model name and "Fix in Integrations ↗". There's no monospace chip.
- REQ-827 [always] (User change: "remove grokbot from ai replies pages") The system shall show no Grokbot or backup-AI tier on the AI replies tab:
  - the threshold zones read "Hand to a person" and "AI answers"
  - the estimate reads "At <x>%, about <y>% of last month's replies would send on their own; the rest go to Needs you"
  - Auto-send is one switch per channel (Email, Chat) for the AI
  - the Grokbot fallback row is removed.
  This supersedes the backup-AI parts of REQ-812, REQ-813 and REQ-815. Grokbot elsewhere (Integrations, Inbox history, Dashboard) is unchanged unless the user asks.

### Workflows list
- REQ-816 [always] The system shall show the stats as a 4-cell hairline strip card (Active, Runs last 7 days, Completed without a person, Handed to a person) with small trend text.
- REQ-817 [always] The system shall show workflows as a table-like list with columns:
  - name + trigger summary
  - channel icons
  - runs (7d)
  - completion % with a thin bar
  - status (pill + switch)
  - ⋯ menu
  plus a search field once there are more than 5 workflows.
- REQ-818 [always] The system shall show the template cards with an icon tile each (return, truck/address, briefcase, ruler), the description, "<n> steps", and "Use template" plus "Preview" (Preview opens a read-only step list in a sheet) (interpreted).

### Workflow editor
- REQ-819 [always] The system shall show the editor header with:
  - Back
  - an inline-editable title (plain text until clicked, with a pencil on hover)
  - the status pill + switch
  - the List | Canvas toggle
  - an Issues chip (when there are issues)
  - Test workflow
  - Save (in the sticky save bar).
- REQ-820 [always] The system shall render List view steps on a subtle dotted-grid surface:
  - each step card has a category icon tile in a muted category colour (Talk, Verify, Shopify, Loop, Logic, Ticket, End), the step number, the title, a one-line summary, and variables as chips
  - the selected step is highlighted with its settings in a right panel (≥1280) or a sheet
  - branch labels are pills above their columns.
- REQ-821 [always] The system shall show the trigger card with intent, phrase chips, channel icons and the quick reply pill, styled as the "start" card with the lightning icon tile.

### Conversation testing
- REQ-822 [always] The system shall show a left setup card:
  - Channel (Chat / Email)
  - Customer (pick a seeded customer such as Margaret Okonkwo, or "Guest"), which fills the order context
  - Order (optional)
  - Voice (Saved / Draft indicator)
  - scenario cards (Sizing, Tracking, Returns, Damaged, Wholesale), each with a one-line description
  - Reset.
- REQ-823 [always] The system shall render the chat transcript in the Inbox message-card style. Each AI reply has a compact insight row (confidence chip coloured by meaning, decision "Would send" / "Would hand over", articles count) that expands to the full details (articles with scores, data checked, reasoning).
- REQ-824 [always] The system shall show the empty state: "Chat with the AI as a customer", the line "See which guidance it uses, how confident it is, and whether it would hand over.", and scenario shortcuts.
- REQ-825 [event] When the user clicks "Run all scenarios", the system shall run the 5 scenarios and show a results table (scenario, confidence, decision, articles), with each row reopening that conversation (interpreted).

### Phone
- REQ-826 [state] While on a phone, the system shall stack every page: the preview or insight panels become collapsible cards or sheets, tables become cards, the editor is List only, and the test setup becomes a collapsible card above the chat.

### Macros removed (user change)
- REQ-856 [always] The system shall have NO macros anywhere. Guidance tabs become Articles · Import CSV (articles only). The Inbox composer has no macro search, Macro toolbar button, macro picker or macro shortcut. Macro mocks, API, types, search results, README and styleguide sections are removed. This supersedes the macro parts of REQ-596, REQ-598, REQ-661 and the earlier Guidance and Inbox macro journeys.

## Quality requirements
```
Q-81 Tag: Visual.Premium
     Scale: reviewer judgement that the 4 pages look modern, premium and organized, consistent with Inbox/Dashboard/Channels
     Meter: human at 1440
     Must: pass   Plan: pass
Q-82 Tag: Consistency
     Scale: controls or sections on /ai/* not using the shared section pattern, input caps, save bar or AI wording
     Meter: tester review + grep "Claude" outside config
     Must: 0   Plan: 0
Q-83 Tag: Regression
     Scale: Phase 9/13 AI behaviours broken (voice save + counters + over-limit, thresholds, auto-send, auto-refund limit flows into Inbox/Dashboard, workflows create/edit/test/validation, multi-turn testing)
     Meter: phase9/13 checks + tester
     Must: 0   Plan: 0
Q-84 Tag: Access + Device
     Scale: axe serious/critical; overflow or targets < 44px at 360/390/430
     Meter: audit + phone-sweep
     Must: 0   Plan: 0
```
