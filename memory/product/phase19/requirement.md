# Phase 19 — Conversation testing UI

Version: phase-19

## Goal
The user asked to "improve conversation testing ui". Make Conversation testing (AI & Workflows → Conversation testing) feel like a calm, full-height test workspace. It has a slim setup rail, a chat in the middle that looks like the Inbox, and an inspector that explains the selected AI reply (confidence vs threshold, decision, sources, order checked, workflow it would start). "Run all scenarios" becomes a clear scorecard. Frontend-only, mock data through `/src/api` (see `../overview.md`).

## Functional requirements

### Layout
- REQ-976 [state] While the screen is 1280px wide or more, Conversation testing shall show three columns: a setup rail (~300px), the test chat (fills the rest) and an inspector (~340px).
- REQ-977 [state] While the screen is 1024–1279px wide, the inspector shall open as a right-side sheet from a "Details" button on each AI reply.
- REQ-978 [state] While the screen is narrower than 1024px, setup shall collapse into a "Test setup" sheet opened from the chat header, and AI reply details show inline under the reply.
- REQ-979 [always] The workspace shall fill the viewport height below the tabs. The chat thread scrolls inside its panel, the composer stays at the bottom of the chat panel, and the page itself does not scroll at 1440×900.

### Setup rail
- REQ-980 [always] The setup rail shall hold Channel (Chat / Email), Customer, Order (optional) and a one-line "Brand voice: Saved voice" row with a link to Brand voice. Scenarios are not listed there.
- REQ-981 [always] When a customer is picked, the rail shall show a compact context card (name, email, orders count, latest order number and status) with no truncated text.
- REQ-982 [always] The rail shall show "Hands to a person below 75%" with a "Change" link to AI replies, using the saved threshold.

### Chat
- REQ-983 [always] The chat panel shall have a header with the test context ("Chat · Margaret Okonkwo" or "Email · Guest"), a "Scenarios" menu, "Run all scenarios" and "Reset".
- REQ-984 [always] The empty chat shall show "Try a scenario" with the 5 scenarios as cards (title + one-line description) in a responsive grid, plus a line "Or type what the customer says below.".
- REQ-985 [event] When the user picks a scenario (card or menu), the system shall send its customer message and show the AI reply. (no failure mode)
- REQ-986 [always] Customer messages shall sit left and AI replies right, using the Inbox message styles.
- REQ-987 [always] Each AI reply shall show one compact meta line: confidence chip (green at or above the threshold, amber below), decision ("Would send", "Would hand to a person" or "Would start workflow"), and the sources count.
- REQ-988 [event] When the user clicks an AI reply, the system shall select it (subtle highlight) and show its details in the inspector. The newest AI reply is selected by default.
- REQ-989 [always] The composer shall match the Inbox composer style, with placeholder "Reply as <customer>…" (or "Type what the customer says…" for Guest), Enter to send, Shift+Enter for a new line, and a round send button.
- REQ-990 [unwanted] If the user sends an empty message, then the system shall not send it and the send button stays disabled.

### Inspector
- REQ-991 [always] The inspector shall show a confidence bar with a marker at the threshold and the value (for example "83% · threshold 75%").
- REQ-992 [always] The inspector shall show the decision in words: "Would send on its own", "Would hand to a person — confidence below 75%" or "Would start workflow: <name>".
- REQ-993 [always] The inspector shall list only the sources that informed the reply (relevance 40% or more), each with its relevance and a link that opens the Guidance article. Lower matches are hidden behind "Show 3 weaker matches". (interpreted)
- REQ-994 [always] The inspector shall show "Order checked: #GB20398 · delivered" when an order was used.
- REQ-995 [always] The inspector shall show a short "Why" line (the existing reasoning text).
- REQ-996 [event] When the customer message matches a published, active workflow's trigger (the same matching the widget uses), the AI reply decision shall be "Would start workflow: <name>" and the inspector shall show "Open workflow" (to the editor) and "Test in workflow" (opens that workflow's Test panel). (interpreted)

### Run all scenarios
- REQ-997 [event] When the user clicks "Run all scenarios", the system shall run the 5 scenarios and show a scorecard in the chat panel.
- REQ-998 [always] The scorecard header shall summarise the run: "5 scenarios · <n> would send · <n> would hand to a person · <n> would start a workflow · average confidence <n>%".
- REQ-999 [always] Each scorecard row shall show the scenario, a confidence bar with the threshold marker, the decision chip, the workflow (if any) and the sources count.
- REQ-1000 [event] When the user clicks a scorecard row, the system shall open that scenario's transcript in the chat with its AI reply selected, plus a "Back to results" link.
- REQ-1001 [always] Reset shall clear the chat, the selection and the scorecard, but keep the setup choices.

### States
- REQ-1002 [state] While the AI reply is being generated, the chat shall show a typing indicator in the AI position and disable Send.
- REQ-1003 [unwanted] If the mock reply fails (Error demo state), then the system shall show "Couldn't get a reply. Try again." with a Retry button in the thread.
- REQ-1004 [always] Test conversations shall never be recorded in Inbox, Dashboard or workflow Runs.

## Quality requirements
```
Q-869  Tag: Testing.Layout
       Scale: px horizontal overflow; page-level vertical scroll at 1440×900 with a 6-message thread
       Meter: scripted check at 390, 768, 1024, 1280, 1440, 1920
       Must: 0 overflow, 0 page scroll at 1440×900
       Plan: same
Q-870  Tag: Testing.Consistency
       Scale: mismatches between the threshold shown in rail, chips, inspector and AI replies settings; between the workflow the test says it would start and the workflow the widget starts for the same message
       Meter: scripted check over the 5 scenarios + 3 workflow phrases
       Must: 0
       Plan: 0
Q-871  Tag: Testing.Speed
       Scale: ms from Send to AI reply shown (mock)
       Meter: browser timing, 5 trials
       Must: 2000 (estimate)
       Plan: 900
Q-872  Tag: Testing.Accessibility
       Scale: serious/critical axe violations; AI replies not selectable by keyboard
       Meter: axe + keyboard pass
       Must: 0
       Plan: 0
Q-873  Tag: Testing.Look
       Scale: reviewer judgement vs refined Inbox (calm, organized, no dead space, no truncated context)
       Meter: human (shots at 1440 and 390)
       Must: no truncated text, no duplicate scenario lists
       Plan: user calls it clear and premium
```
