# Phase 19 journeys — Conversation testing UI

Seed: Ava Martinez (Admin). Customers: Guest, Margaret Okonkwo (margaret.okonkwo@example.com, #GB20398 delivered). Saved threshold 75%. 5 scenarios: Sizing, Tracking, Returns, Damaged, Wholesale. 8 workflows from phase 16 (Friday Drops off). All data is MOCKED.

superseded: the setup-panel scenario list and run-all table layout parts of [JRN-183] (phase 15)

### JRN-219 Workspace at a glance
- steps: Open AI & Workflows → Conversation testing at 1440×900.
- expected: Three columns: setup rail, chat, inspector. The page doesn't scroll. The rail shows Channel, Customer, Order, "Brand voice: Saved voice" and "Hands to a person below 75%" with Change, and no scenario list. The chat header reads "Chat · Guest" with Scenarios, Run all scenarios and Reset. The empty chat shows "Try a scenario" with 5 cards and "Or type what the customer says below.".

### JRN-220 Customer context
- steps: Pick Margaret Okonkwo.
- expected: The context card shows name, email, orders count and "#GB20398 · Delivered" with nothing truncated. The header becomes "Chat · Margaret Okonkwo", and the composer placeholder reads "Reply as Margaret Okonkwo…".

### JRN-221 Chat and inspector
- steps: Click the "Sizing" card. Then type "Can it arrive before Saturday?" and press Enter. Click the first AI reply. Press Shift+Enter in the composer. Try sending empty.
- expected: Customer messages sit left and AI replies right, in Inbox styles, with a typing indicator while waiting. Each AI reply has one meta line (confidence chip green ≥75 or amber below, decision, sources count). The newest reply is selected by default, and clicking the first moves the highlight and updates the inspector: confidence bar with the 75% marker, the decision in words, sources ≥40% with relevance and article links, "Show N weaker matches", "Order checked" when applicable, and the Why line. Shift+Enter adds a new line, and empty Send is disabled.

### JRN-222 Workflow detection matches the widget
- steps: As Margaret, send "I want to cancel my order", then "my hat arrived damaged", then "where is my order".
- expected: The replies show "Would start workflow: Cancel an order", "Damaged item claim" and "Order tracking", the same workflows the widget starts for those phrases. The inspector offers "Open workflow" and "Test in workflow", which open the right workflow editor and Test panel.

### JRN-223 Run all scenarios scorecard
- steps: Click Run all scenarios. Click the Wholesale row. Click "Back to results". Click Reset.
- expected: The header reads "5 scenarios · n would send · n would hand to a person · n would start a workflow · average confidence n%", and the counts match the rows. Rows show a confidence bar with the threshold marker, a decision chip, the workflow and the sources count. Clicking Wholesale opens its transcript with the reply selected, and Back returns to the scorecard. Reset clears the chat and scorecard but keeps Margaret and #GB20398.

### JRN-224 Threshold stays in sync
- steps: In AI replies set the threshold to 85 and save. Return to Conversation testing and run Tracking.
- expected: The rail reads "Hands to a person below 85%", the chip colours and inspector marker use 85, and a reply under 85 says "Would hand to a person — confidence below 85%". Reset the threshold to 75 afterwards.

### JRN-225 States, tablet, phone
- steps: Use the demo switcher Error state and send a message, then click Retry. View at 1024, 768 and 390.
- expected: "Couldn't get a reply. Try again." with Retry. At 1024 the inspector opens as a sheet from Details. Under 1024, setup is a "Test setup" sheet from the chat header and details sit inline. At 390 there's no sideways scroll, and the composer stays at the bottom. Test chats never appear in Inbox, Dashboard or workflow Runs.
