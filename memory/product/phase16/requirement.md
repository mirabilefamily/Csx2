# Phase 16: Workflows build-out (requirement)

- Phase version: phase-16
- Goal: remove templates and build Workflows out into a full set of real, working (MOCKED) automations, plus deeper builder capabilities: more step types, run history per workflow, and draft/publish with versions. Everything stays MOCKED (see overview.md).
- User choices:
  - Remove templates.
  - Fully build Start a return (Loop), Change shipping address, Cancel an order, Damaged item claim, Wholesale inquiry, Hat size finder and Friday Drops / restock alerts, alongside Order tracking.
  - The builder gets more steps, a run history per workflow, and draft/publish with versions.
  - New workflows start On, except those needing setup.
- Supersedes: REQ-723 (template choice), REQ-726, REQ-727 (template part), REQ-749 and REQ-818 (template cards and Preview). "+ New workflow" opens a blank Draft.

## Functional requirements

### List
- REQ-828 [always] The system shall remove the "Start from a template" section and the "Use a template" option. "+ New workflow" opens a blank Draft, and the row ⋯ "Duplicate" covers copying.
- REQ-829 [always] The system shall seed 8 workflows, shown in this order:

  | Workflow | Status |
  |---|---|
  | Order tracking | On, v3 |
  | Start a return (Loop) | On, v1 |
  | Change shipping address | On, v1 |
  | Cancel an order | On, v1 |
  | Damaged item claim | On, v2 |
  | Wholesale inquiry | On, v1 |
  | Hat size finder | On, v1 |
  | Friday Drops & restock alerts | Off, "Needs setup" |

  Each has realistic mock runs, completion % and edited info.
- REQ-830 [state] While a workflow has unresolved setup issues, the system shall show an amber "Needs setup" chip in its row with the reason on hover. Its switch is disabled with "Fix <n> issues before turning this on."
- REQ-831 [always] The system shall show in each row: the version ("v3"), and a "Draft changes" chip when an unpublished draft exists.

### New step types (added to the Add step menu and both views)
- REQ-832 [always] The system shall add these step types, each with settings, a validation rule, a summary line and test-run behaviour:
  - Talk: **Pick an order** (a list of the verified customer's orders with filters: unfulfilled / delivered within N days); **Pick items** (multi-select line items with quantity); **Address form** (structured fields with validation); **Upload photos** (1–3 images, jpg/png ≤10MB, required/optional; mock, previews only); **Consent** (a checkbox with custom text, required).
  - Shopify: **Check inventory** (SKU or picked item → in stock yes/no + quantity); **Cancel order**; **Create replacement order** ($0 draft for the picked items); **Issue refund** (amount = picked items or a custom value; respects the auto-refund limit; above the limit → the "needs approval" output); **Create discount code** (percent or fixed, expiry).
  - Messaging: **Send email** (to the customer; subject and body with variables).
  - Logic: **Wait** (a duration, or until the customer replies with a timeout); **Run another workflow** (pick a workflow; the current one ends there).
  - Marketing: **Add to email list** (pick a list; "No lists connected" in the mock, so it's a setup issue).
- REQ-833 [always] The system shall give each Shopify or Loop action step two outputs, "Success" and "Failed" (with "Needs approval" for refunds), which show as branches in List and Canvas.

### Seeded workflows (exact flows; the builder may refine copy)
- REQ-834 **Start a return (Loop):**
  1. Verify (email + code on chat, skipped on email/form).
  2. Pick an order (delivered within 30 days). If there are none: "I don't see an order delivered in the last 30 days." → Hand over option.
  3. Pick items, then the reason (buttons: Too small, Too big, Changed my mind, Arrived damaged → Run another workflow: Damaged item claim).
  4. Refund method (Original payment / Store credit).
  5. Loop: Start a return → "#LR-<n>" plus "Download return label".
  6. Send email (confirmation), then End (CSAT).
- REQ-835 **Change shipping address:** verify → Pick an order (unfulfilled) → Condition fulfilled? → Address form → Shopify update address → confirmation with the new address → End. Fulfilled orders: "This order has already shipped, so I can't change the address. I'll pass you to the team." → Hand over (tag "address-change").
- REQ-836 **Cancel an order:**
  1. Verify, then Pick an order (unfulfilled).
  2. Confirm (buttons "Yes, cancel it" / "Keep my order").
  3. Shopify: Cancel order → "Order #<n> is cancelled. $<total> will go back to your original payment in 5–10 business days." → End.
  4. If fulfilled: "This order has already shipped." → Run another workflow: Start a return. "Keep my order" → End.
- REQ-837 **Damaged item claim:**
  1. Verify → Pick an order → Pick items.
  2. Upload photos (required, 1–3).
  3. Choose "Send a replacement" / "Refund me".
  4. Replacement: Check inventory → in stock → Create replacement order ("#D<n>") → Add tag "damaged" → End. Out of stock → offer Refund.
  5. Refund: Issue refund → ≤ the auto-refund limit ($75): refunded + confirmation. Above the limit → "Needs approval" → Hand over to Returns with the note "Refund $<x> above $75 limit, photos attached" (tag "damaged").
- REQ-838 **Wholesale inquiry:** business name, store URL (validated), location, expected monthly volume (buttons) → Add tag "wholesale" → Send email (internal-style acknowledgement to the customer) → Hand over to Wholesale.
- REQ-839 **Hat size finder:** head circumference (cm / in / "I don't know" → measuring tip → re-ask) → Condition by range → recommend a size (S <56, M 56–57, L 58–59, XL ≥60, interpreted) → Send message with the "Shop hats in <size>" link → End.
- REQ-840 **Friday Drops & restock alerts (Off, Needs setup):** ask (buttons "Friday Drops" / "A product restock") → for restock, ask the product and size → Ask the email → Consent ("Email me about Goorin drops and restocks.") → Add to email list (**no list selected** = setup issue) → "You're on the list. We'll email you when it drops." → End.
- REQ-841 [always] The system shall start the matching On workflow in the widget and test panel from intents: "cancel my order" → Cancel; "my hat arrived damaged" / "it's broken" → Damaged claim; "what size am I" → Hat size finder; "change my address" → Change shipping address; "start a return" → Start a return. The seeded widget starter "Can I cancel / edit my order?" now starts Cancel an order, and "Wholesale Inquiry" starts Wholesale inquiry.

### Draft / publish / versions
- REQ-842 [always] The system shall give each workflow a published version (what runs live when On) and at most one draft. Edits always go to the draft.
- REQ-843 [always] The system shall show the editor header with "Draft changes" or "Published v<n>", a "Discard draft" action, and a primary "Publish" button (instead of Save). Publish runs validation and asks for an optional note ("What changed?").
- REQ-844 [unwanted] If the draft has issues, then the system shall block Publish with "Fix <n> issues before publishing."
- REQ-845 [event] When the user publishes, the system shall create v<n+1> with author, time and note, and show the toast "Published v<n+1>".
- REQ-846 [always] The system shall test the DRAFT in Test workflow, with "Testing draft" or "Testing v<n>" shown in the test panel.
- REQ-847 [state] While a workflow has never been published, the system shall keep its On switch disabled with "Publish this workflow before turning it on."
- REQ-848 [always] The system shall give the editor tabs "Build · Runs · Versions".
- REQ-849 [always] The system shall show the Versions tab as a list (v<n>, author, relative time, note, "Live" badge on the published one) with View (read-only List/Canvas), "Restore as draft" (with confirm), and a change summary per version ("+2 steps, 1 changed").

### Run history
- REQ-850 [always] The system shall show on the Runs tab:
  - range chips (7 days / 30 days)
  - stats (runs, completed, handed to a person, dropped off, failed)
  - a step funnel (each step's reach count, with the biggest drop-off highlighted)
  - a runs table: time, customer (masked email for guests), channel, outcome pill (Completed / Handed to a person / Dropped off / Failed), last step, duration, version.
- REQ-851 [event] When the user clicks a run, the system shall open a run-detail drawer with:
  - a step-by-step timeline of inputs and outputs (codes and emails masked: "m•••@example.com", "••••••")
  - the outcome
  - "Open ticket" when the run created or linked to an Inbox ticket.
- REQ-852 [always] The system shall link at least 2 seeded runs to existing Inbox tickets. GB-1076 (crushed fedora) is a Damaged item claim run handed over with "Refund $148.00 above $75 limit". Its Inbox thread shows the event line "Damaged item claim handed over: refund above $75 limit".
- REQ-853 [always] The system shall offer a "Show run stats" toggle in Build that overlays per-step reach counts as small badges on step cards and canvas nodes (last 7 days).
- REQ-854 [always] The system shall record test runs separately (not in run history) (interpreted).

### Phone
- REQ-855 [state] While on a phone, the system shall show Runs as cards, the funnel as a vertical list, the run detail as a full-screen sheet, Versions as cards, and Publish in the sticky bar.

## Quality requirements
```
Q-85 Tag: Flow.Correctness
     Scale: seeded workflows whose test run doesn't reach the documented outcome for its main path and each documented branch
     Meter: tester runs every path in REQ-834..840 once
     Must: 0   Plan: 0
Q-86 Tag: Money.Rules
     Scale: refunds issued above the auto-refund limit without the Needs approval/hand over path; cancel refund ≠ order total; return offered outside 30 days
     Meter: tester on Damaged claim ($148 vs $40 items), Cancel, Return
     Must: 0   Plan: 0
Q-87 Tag: Trust.Verification
     Scale: any order data, address or photo step shown in chat before code verification
     Meter: tester on all 5 verifying workflows
     Must: 0   Plan: 0
Q-88 Tag: Versioning.Integrity
     Scale: live runs using a draft, publishes allowed with issues, restores that lose steps
     Meter: tester edit → test → publish → restore cycle on Order tracking
     Must: 0   Plan: 0
Q-89 Tag: Data.Consistency
     Scale: run-history numbers that disagree with list stats or the funnel for the same range
     Meter: tester compares list row vs Runs tab for 3 workflows
     Must: 0   Plan: 0
Q-90 Tag: Access + Device
     Scale: axe serious/critical; overflow or targets < 44px at 360/390/430
     Meter: audit + phone-sweep
     Must: 0   Plan: 0
```
