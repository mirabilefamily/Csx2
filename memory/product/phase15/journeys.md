# Phase 15 Journeys (AI & Workflows design pass)

Sign in as ava@goorin.com / goorin123 (Admin) at 1440. All data is MOCKED.

superseded: the Brand voice, AI replies and Conversation testing layout assertions in JRN-118 and JRN-156 (tabs now exclude Routing; JRN-157 is retired by REQ-805). Behaviours still apply.

### JRN-177 Tabs and Routing removed
- steps: Open /ai. Read the tabs. Open /ai/routing. Search "business hours" with Ctrl+K.
- expected:
  - The tabs are Brand voice · AI replies · Workflows · Conversation testing, each with a one-line intro.
  - /ai/routing redirects to /ai/workflows.
  - Search shows no Routing or business-hours result.

### JRN-178 Brand voice with live preview
- steps: Open Brand voice. Click the "Concise" preset. Edit How to respond. Add "Avoid: cheap". Switch the preview sample to "late order". Exceed the Tone limit. Click "Test this voice". Go back, Save.
- expected:
  - The fields sit in Identity / Tone / How to respond / Words / Sign-off cards.
  - The preset appends to Tone. The preview reply updates live with the draft voice and avoids "cheap".
  - The over-limit error blocks Save.
  - Test this voice opens Conversation testing with "Draft voice".
  - Save gives "All changes saved". A single "How brand voice works" card replaces the two old side cards.

### JRN-179 AI replies
- steps: Read the impact strip. Move the threshold to 60%, then 85%. Toggle Email auto-send for Backup AI. Set the auto-refund max to 120. Read the Grokbot row.
- expected:
  - The strip shows AI resolved 78%, Handed to a person 22%, Auto-sent and Auto-refunds.
  - The threshold value chip and the estimate sentence update with the slider. The zones read "Hand to backup AI" / "AI answers".
  - The table columns read "AI" and "Backup AI (Grokbot)".
  - The refund max saves, and the Dashboard refunds card and the Inbox refund note show $120.
  - The Grokbot row shows "Error · 401 Unauthorized" and "Fix in Integrations ↗". No "Claude" appears.

### JRN-180 Workflows list
- steps: Read the stats strip and the Order tracking row. Hover the completion bar. Open Preview on the "Hat size finder" template, then Use template. Create 5 more from templates, then use the search.
- expected:
  - A 4-cell hairline stats card.
  - The row shows trigger, channel icons, runs, a completion % with bar, the status pill and switch, and ⋯.
  - Preview shows the read-only steps in a sheet, and Use template creates a Draft.
  - Search appears once there are more than 5 workflows and filters by name or trigger.

### JRN-181 Workflow editor design
- steps: Open Order tracking. Click the title, rename it, press Enter. Click step 4. Look at the branch labels. Introduce an issue. Toggle Canvas and back.
- expected:
  - The title is plain text and becomes editable on click.
  - Step cards show category icon tiles and variable chips on the dotted surface. The selected step is highlighted with its settings in the right panel. Branch labels are pills.
  - The Issues chip appears with a count, and the save bar shows "Unsaved changes".
  - All Phase 13 editor behaviours still work.

### JRN-182 Conversation testing
- steps: Pick customer Margaret Okonkwo, channel Chat, scenario "Damaged". Send a follow-up. Expand the insight row. Click Run all scenarios, then open one result row. Reset.
- expected:
  - The order context fills from Margaret's data.
  - Replies render as Inbox-style cards with an insight row (coloured confidence chip, Would send / Would hand over, article count) that expands to the details.
  - Run all shows a 5-row results table, and each row reopens its conversation.
  - Reset returns to the empty state with its copy.

### JRN-183 Phone and access
- steps: At 390 visit all 4 tabs, the editor and a test run.
- expected:
  - Stacked layouts, with the preview and insights as collapsible cards or sheets and tables as cards.
  - No overflow, tap targets ≥ 44px, axe 0 serious or critical issues.
