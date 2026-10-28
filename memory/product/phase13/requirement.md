# Phase 13: AI & Workflows refresh + process-automation Workflows (requirement)

- Phase version: phase-13
- Goal: refine the AI & Workflows page design and turn "Workflows" into real (MOCKED) process automations. Admins can create as many as they like, edit them as a step list or a drag-and-drop canvas, turn them on or off, and test them in a live chat preview. Order tracking ships as the flagship example. Everything stays MOCKED behind /src/api (see overview.md).
- User choices:
  - Builder style: the user picked both the step list (Intercom-like) and the drag-and-drop canvas (Zapier-like). Interpreted: one workflow, two views with a List / Canvas toggle that edit the same data.
  - Runs on chat widget, contact form and email. The AI starts the right workflow when the customer asks.
  - Ready-made examples: the user picked both "4 examples" and "only Order tracking". Interpreted: Order tracking is complete and Active. Start a return (Loop), Change shipping address, Wholesale inquiry and Hat size finder ship as templates (Off) that admins can create from.
  - Escalation rules, business hours and assignment move to a new "Routing" tab.
  - Testing: "Test workflow" runs it in a live chat preview, with the code shown in a mock email inbox.
- Tabs after this phase: Brand voice (/ai/voice) · AI replies (/ai/replies) · Workflows (/ai/workflows) · Routing (/ai/routing) · Conversation testing (/ai/testing).

## Functional requirements

### Page design
- REQ-717 [always] The system shall show the AI & Workflows header with the subtitle "How the AI sounds, what it can do on its own, and when it hands over to your team." (interpreted copy) and the 5 tabs in the order above.
- REQ-718 [always] The system shall render every tab in the shared app tokens and the Settings two-column pattern (label and description left, controls right), with one sticky save bar style ("All changes saved" / "Unsaved changes" + primary Save).
- REQ-719 [always] The system shall keep selects and inputs one line high, with no wrapping text inside a select (fixes "Message contains keyword" wrapping), and align rule rows to one grid.

### Routing tab
- REQ-805 [always] (User change, supersedes REQ-720 to REQ-722 and the Routing tab in REQ-717) The system shall have NO Routing tab and no escalation-rules, business-hours or assignment-rule settings anywhere. The AI & Workflows tabs are Brand voice · AI replies · Workflows · Conversation testing. /ai/routing redirects to /ai/workflows.
- REQ-720 [always] (superseded by REQ-805) The system shall show on /ai/routing the escalation rules, business hours and assignment rule (round-robin / manual), moved from Workflows with the same behaviour.
- REQ-721 [always] The system shall render escalation rules as sentence rows "If [condition] [value] → hand to [Grokbot / Team / Person]", with drag-to-reorder and delete.
- REQ-722 [event] When the user opens the old Workflows deep links for rules or hours (search results), the system shall land on /ai/routing.

### Workflows list
- REQ-723 [always] The system shall show on /ai/workflows a "+ New workflow" button with two choices: "Start from blank" and "Use a template".
- REQ-724 [always] The system shall show a stats strip: Active workflows, Runs (7 days), Completed %, Handed to a person %.
- REQ-725 [always] The system shall list workflows as rows with:
  - name and trigger summary (e.g. "When a customer asks where their order is")
  - channel icons (chat / form / email) and the status (Active / Off / Draft) as a toggle or pill
  - runs over 7 days, completed %, and "Edited <relative> by <name>"
  - a ⋯ menu: Edit, Test, Duplicate, Rename, Delete (with confirm).
- REQ-726 [always] The system shall show a "Start from a template" section with cards for Start a return (Loop), Change shipping address, Wholesale inquiry and Hat size finder. Each card gives a one-line description, its steps count and "Use template".
- REQ-727 [event] When the user clicks "Use template" or "Start from blank", the system shall create a new Draft workflow and open its editor.
- REQ-728 [unwanted] If the user turns on a workflow that has validation errors, then the system shall keep it Off and show "Fix <n> issues before turning this on." with a link to the editor.
- REQ-729 [state] While two Active workflows share the same trigger intent on the same channel, the system shall show a warning "Two active workflows use this trigger. The first one in the list runs." with the list order draggable (interpreted).
- REQ-730 [state] While no workflows exist, the system shall show "No workflows yet. Start from a template or build your own." with both actions.

### Workflow editor
- REQ-731 [always] The system shall show an editor top bar with:
  - back to Workflows and the inline-editable name
  - the status pill, and "All changes saved" / "Unsaved changes"
  - a List / Canvas segmented toggle
  - "Test workflow", and a primary "Turn on" (Draft/Off) or "Save changes" (Active).
- REQ-732 [always] The system shall show the Trigger as the first step:
  - "When the AI detects" an intent name, with example phrases (add/remove chips)
  - channels Chat / Contact form / Email (checkboxes)
  - "Also show as a quick reply in chat" with the button label.
- REQ-733 [always] The system shall offer these step types from an "Add step" menu, grouped:
  - Talk: Send message, Ask a question (text, email, number, buttons; saved to a variable; optional validation)
  - Verify: Send email code (6 digits, expires in 10 min), Check code (max attempts)
  - Shopify: Find orders by email, Show orders, Update shipping address
  - Loop: Find returns, Start a return
  - Logic: Condition (if / otherwise on variables or channel)
  - Ticket: Add tag, Set field, Hand over to a person (team, note)
  - End: End workflow (optional CSAT question).
- REQ-734 [always] The system shall let messages insert variables as chips (e.g. {{email}}, {{orders.count}}, {{order.tracking_url}}) from a "Variable" picker showing only variables set earlier in the flow.

#### List view
- REQ-735 [always] The system shall show the List view as numbered step cards stacked top to bottom with connector lines, a "+" between steps to insert, a drag handle to reorder, and a ⋯ menu (Duplicate, Delete).
- REQ-736 [always] The system shall show a Condition as side-by-side branch columns titled with the rule (e.g. "Code is correct" / "Otherwise"), each with its own steps and "+", ending in a "Continue", "End" or "Hand over" marker.
- REQ-737 [event] When the user clicks a step, the system shall open its settings in the right panel. Changes show in the card summary instantly.

#### Canvas view
- REQ-738 [always] The system shall show the Canvas view as a pannable, zoomable board with each step as a box, connected by arrows, plus zoom in/out, fit view, a minimap and "Tidy up" auto-layout.
- REQ-739 [event] When the user drags a step's handle onto another step, the system shall connect them. Selecting an arrow and pressing Delete removes it.
- REQ-740 [event] When the user drops a step from the "Add step" panel onto the board, the system shall add it unconnected and select it.
- REQ-741 [always] The system shall keep List and Canvas in sync: switching views preserves every step, branch, connection and setting.
- REQ-742 [state] While the canvas has steps not connected to the trigger, the system shall mark them with a warning outline and list them as issues.
- REQ-743 [state] While the viewport is below 1024px, the system shall show List view only, with the note "Canvas editing works on larger screens." (interpreted).

#### Validation
- REQ-744 [always] The system shall show an "Issues" count in the top bar that opens a list with jump links. Rules:
  - every path ends in End or Hand over
  - Ask a question saves to a variable
  - Check code follows a Send email code
  - messages aren't empty
  - variables are set before they're used
  - no unconnected steps.
- REQ-745 [unwanted] If the user leaves the editor with unsaved changes, then the system shall ask "Discard unsaved changes?".

### Order tracking (seeded, Active)
- REQ-746 [always] The system shall seed "Order tracking", Active on Chat, Contact form and Email. Trigger: intent "Order status", phrases "where is my order", "tracking number", "has my order shipped", and the quick reply "Track my order". Steps:
  1. Send message: "Happy to help you track your order."
  2. Ask a question (email): "What email did you use for your order?" → {{email}}. Validation: "That doesn't look like an email address."
  3. Send email code to {{email}}: "We've sent a 6-digit code to {{email}}. It expires in 10 minutes."
  4. Check code (3 attempts). On a wrong code: "That code didn't match. You have <n> tries left." with "Resend code". After 3 failures, Hand over to a person (team Support, tag "verification-failed").
  5. Find orders by {{email}}.
  6. Condition: orders found?
     - Otherwise: "I couldn't find any orders for {{email}}." with buttons "Try another email" (back to step 2) / "Talk to a person" (Hand over).
     - Yes: Show orders (latest 3): order number, date, items, status, carrier and a "Track package" link.
  7. Ask (buttons): "Anything else I can help with?" "That's all" → End (CSAT) · "Talk to a person" → Hand over.
- REQ-747 [state] While the workflow runs on Email or Contact form, the system shall skip the code steps and send the order details only to the sender's email address. A Condition "Channel is Chat" guards the code steps (interpreted: the reply only reaches the address owner).
- REQ-748 [always] The system shall never show order details in chat before the code is verified.

### Templates (Off until used)
- REQ-749 [always] The system shall provide the templates:
  - **Start a return (Loop):** verify email + code → find orders → pick order and item → reason → Start a return (mock RMA "#LR-<n>" and label link) → End.
  - **Change shipping address:** verify → find unfulfilled orders → Condition fulfilled? → new address form → Update shipping address (mock) → confirm; if fulfilled → Hand over.
  - **Wholesale inquiry:** ask business name, store URL, location, expected volume → Add tag "wholesale" → Hand over to Wholesale.
  - **Hat size finder:** ask head circumference (cm / in / "I don't know" → measuring tip) → Condition by range → recommend S / M / L / XL with a "Shop hats" link → End.

### Test workflow
- REQ-750 [event] When the user clicks "Test workflow", the system shall open a test panel with:
  - a channel switch (Chat / Contact form / Email)
  - a widget-style chat preview
  - a "Customer inbox (mock)" pane
  - a run log listing each executed step and its result
  - Reset.
- REQ-751 [event] When a test run reaches Send email code, the system shall show an email in the mock inbox from "Goorin Bros. <support@goorin.com>" with the subject "Your Goorin verification code" and a random 6-digit code.
- REQ-752 [state] While a test runs, the system shall highlight the current step in the List or Canvas view.
- REQ-753 [event] When the tester enters the correct code for margaret.okonkwo@example.com, the system shall show her real seeded orders (numbers, totals, status, tracking) as order cards.
- REQ-754 [unwanted] If the tester enters a wrong code 3 times, then the system shall run the Hand over step and show "Test run ended: handed to Support (no real ticket created)."
- REQ-755 [state] While testing with an email that has no orders (e.g. new.customer@example.com), the system shall take the "no orders" branch.
- REQ-756 [always] The system shall test unsaved changes without saving them.

### Runtime in the widget (MOCKED)
- REQ-757 [event] When a customer types an order-status question in /widget-demo (or the Channels chat preview) while Order tracking is Active, the system shall run the Order tracking workflow in the widget, with the code email shown in a small "Mock inbox" drawer on the demo page.
- REQ-758 [state] While Order tracking is Off, the system shall answer the same question with the normal AI reply flow.

### Phone
- REQ-759 [state] While on a phone, the system shall show the workflows list as cards and the editor in List view, with step settings as a bottom sheet and Test as a full-screen sheet with Chat / Inbox tabs.

## Quality requirements
```
Q-69 Tag: Data.ViewSync
     Scale: steps, connections or settings lost or changed after toggling List ↔ Canvas 5 times
     Meter: tester on Order tracking + a new 6-step workflow
     Must: 0   Plan: 0
Q-70 Tag: Trust.Validation
     Scale: workflows that can be turned on while they have issues
     Meter: tester tries 4 broken variants
     Must: 0   Plan: 0
Q-71 Tag: Trust.Verification
     Scale: test or widget runs that show order details in chat before a correct code
     Meter: tester, 5 runs incl. wrong codes and expiry
     Must: 0   Plan: 0
Q-72 Tag: Data.Correctness
     Scale: orders shown in a test run that don't match the seed for that email
     Meter: tester compares with Inbox panel for Margaret Okonkwo
     Must: 0   Plan: 0
Q-73 Tag: Perf.Canvas
     Scale: ms from clicking Canvas to the board rendered (20-step workflow); visible lag while dragging
     Meter: script 5 trials at 1440
     Must: ≤ 800, no lag   Plan: ≤ 400
Q-74 Tag: Usability.FirstWorkflow
     Scale: minutes for a first-time admin to build and test a 3-step workflow unaided
     Meter: human
     Must: ≤ 5   Plan: ≤ 3
Q-75 Tag: Access + Device
     Scale: axe serious/critical on /ai/*; overflow or targets < 44px at 360/390/430; canvas actions with no keyboard alternative (the List view counts as the alternative)
     Meter: audit + phone-sweep
     Must: 0   Plan: 0
```
