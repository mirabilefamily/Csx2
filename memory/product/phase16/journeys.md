# Phase 16 Journeys (Workflows build-out)

Sign in as ava@goorin.com / goorin123 (Admin) at 1440. All data is MOCKED. Test emails: margaret.okonkwo@example.com (orders incl. #GB20398 $148.00 delivered, plus unfulfilled #GB20411), new.customer@example.com (no orders). The builder confirms the exact seed orders per path.

superseded: JRN-158 (template cards and Use template), JRN-164 (template test runs), the template parts of JRN-180, and Save-based editing in JRN-159/161, which is replaced by Publish.

### JRN-184 List: 8 workflows, no templates
- steps: Open Workflows. Read the rows. Hover the Restock row chip. Try its switch. Click "+ New workflow".
- expected:
  - There's no Templates section.
  - 8 rows with versions: Order tracking v3, Start a return, Change shipping address, Cancel an order, Damaged item claim v2, Wholesale inquiry, Hat size finder (all On), and Friday Drops & restock alerts (Off, amber "Needs setup").
  - The Restock switch is disabled with "Fix 1 issue before turning this on.".
  - New workflow opens a blank Draft editor.

### JRN-185 New step types in the editor
- steps: In a new workflow add one of each new step: Pick an order, Pick items, Address form, Upload photos, Consent, Check inventory, Cancel order, Create replacement order, Issue refund, Create discount code, Send email, Wait, Run another workflow, Add to email list. Open each one's settings. Toggle Canvas.
- expected:
  - Each step has settings, a summary line and a validation rule (for example Add to email list → "Choose an email list.").
  - Shopify and Loop steps show Success/Failed outputs, and Issue refund also shows Needs approval, as branches in List and Canvas.

### JRN-186 Start a return
- steps: Test the workflow: "I want to start a return", the Margaret email + code, pick #GB20398 (delivered), pick an item, "Too small", Store credit. Then repeat and choose "Arrived damaged".
- expected:
  - No order data appears before the code.
  - Only orders delivered within 30 days are offered.
  - It ends with "#LR-<n>", "Download return label" and the confirmation email in the mock inbox.
  - "Arrived damaged" hands into Damaged item claim (the test panel shows the switch).

### JRN-187 Change shipping address and Cancel an order
- steps: Test Change shipping address with unfulfilled #GB20411 and a new address (try an invalid ZIP first). Then with a fulfilled order. Test Cancel an order on #GB20411: "Keep my order", then again with "Yes, cancel it". Then cancel a fulfilled order.
- expected:
  - The address form validates, and the confirmation shows the new address.
  - A fulfilled order gives the hand-over copy.
  - Keep ends with no change.
  - Cancel confirms "Order #GB20411 is cancelled. $<total> will go back to your original payment in 5–10 business days." with the right total.
  - A fulfilled order goes to Start a return.

### JRN-188 Damaged item claim
- steps: Test it: verify, pick #GB20398 and the fedora, then try to continue without photos. Upload 2 photos, choose Refund ($148). Run it again with a ≤$75 item and choose Refund. Run it again choosing "Send a replacement" for an in-stock item, then an out-of-stock one.
- expected:
  - Photos are required ("Add at least 1 photo.").
  - $148 → "Needs approval" → hand over to Returns with the note "Refund $148.00 above $75 limit, photos attached".
  - ≤$75 → refunded, with a confirmation.
  - In stock → replacement "#D<n>" and the "damaged" tag.
  - Out of stock → a refund is offered.

### JRN-189 Wholesale, Hat size, Restock
- steps: Test Wholesale with an invalid URL, then a valid one. Test Hat size with 57 cm, then 23.6 in, then "I don't know". Open Restock, fix its setup by selecting a list. Note the mock has none.
- expected:
  - Wholesale: the URL is validated, then it tags "wholesale", sends the email and hands to Wholesale.
  - Hat size: 57 cm → M, 23.6 in (about 60 cm) → XL, with the "Shop hats in <size>" link. "I don't know" shows the tip and re-asks.
  - Restock: the list picker shows "No lists connected", so it stays Off / Needs setup.

### JRN-190 Draft, publish, versions
- steps: Open Order tracking (Published v3). Edit a message. Check the header and the list row. Test it. Try Publish with an issue, fix it, then Publish with the note "Friendlier opener". Open Versions, View v2, Restore v2 as draft, then Discard draft.
- expected:
  - Editing shows "Draft changes" in the header and the row chip. The test panel shows "Testing draft", and the widget still runs v3.
  - Publish is blocked with "Fix <n> issues before publishing.". After the fix, the note dialog leads to "Published v4", and the widget now uses v4.
  - Versions lists v1 to v4 with the Live badge on v4, notes and change summaries. View is read-only.
  - Restore asks for confirmation and creates a draft equal to v2. Discard returns to v4.
  - A brand-new workflow can't be turned on before publishing: "Publish this workflow before turning it on."

### JRN-191 Runs tab and run detail
- steps: Open Damaged item claim → Runs. Switch 7 / 30 days. Read the funnel. Filter "Handed to a person". Open the GB-1076 run, then click Open ticket. Back in Build, turn on "Show run stats".
- expected:
  - The stats and funnel match the list row numbers for the range, and the biggest drop-off is highlighted.
  - The table shows time, masked customer, channel, outcome pill, last step, duration and version.
  - The run detail shows the step timeline with masked email and code, and the outcome "Handed to a person · Refund $148.00 above $75 limit". Open ticket goes to GB-1076, whose thread shows the event line.
  - Run stats badges appear on the steps.
  - Test runs don't appear in Runs.

### JRN-192 Widget triggers and starters
- steps: On /widget-demo type "I need to cancel my order", "my hat arrived damaged", "what size am I". Tap the starter "Can I cancel / edit my order?" and "Wholesale Inquiry".
- expected:
  - Each message starts its matching On workflow.
  - The starters start Cancel an order and Wholesale inquiry.
  - Restock (Off) questions get a normal AI answer.

### JRN-193 Phone and access
- steps: At 390 open Workflows, the Damaged claim Runs tab, a run detail, Versions, and a test run with photo upload.
- expected:
  - Runs and Versions show as cards, the funnel as a vertical list, run detail as a full-screen sheet, and the upload works from the phone sheet.
  - No overflow, tap targets ≥ 44px, axe 0 serious or critical issues.
