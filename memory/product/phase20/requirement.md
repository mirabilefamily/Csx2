# Phase 20 — CSAT preview: Chat + Email templates

Version: phase-20

## Goal
The user said the CSAT preview "does not fit modern chat updates, should have chat and email template preview". Settings → CSAT gets a two-mode preview:
- **Chat** shows the survey inside the real, newly styled chat widget at the end of a resolved conversation.
- **Email** shows the survey email in an email frame, plus the survey page the email links to.

The survey messages become an editable template (subject, intro, chat prompt, thank-you), and the rating style lives here for both channels. Frontend-only, mock data through `/src/api` (see `../overview.md`).

## Functional requirements

### Layout and template fields
- REQ-1005 [always] Settings → CSAT shall use the shared settings-plus-preview layout (REQ-956), with the preview sticky on the right at ≥1024px.
- REQ-1006 [always] The settings column shall have three sections in this order: "Questions" (existing builder), "Messages" (new) and "Delivery" (existing send delay, channels, low-score alerts).
- REQ-1007 [always] "Messages" shall have these fields:
  - Email subject (default "How did we do, {first_name}?")
  - Email intro (default "Thanks for reaching out about "{ticket_subject}". It takes 10 seconds to tell us how it went.")
  - Chat prompt (default "Glad that's sorted! Mind rating this chat?")
  - Thank-you message (default "Thanks, {first_name}! Your feedback helps us make better hats and better help.") (interpreted)
- REQ-1008 [always] Each Messages field shall offer insertable variable chips {first_name}, {ticket_subject} and {agent_name}.
- REQ-1009 [unwanted] If Email subject or Chat prompt is empty on Save, then the system shall show "Add a subject." or "Add a chat prompt." and block Save.
- REQ-1010 [always] "Rating style" (Stars / Emoji / Numbers) shall live in CSAT and apply to both chat and email. Channels → Chat → Display shows the post-chat survey on/off switch plus the link "Survey questions and style live in Settings → CSAT". (interpreted)

### Preview: Chat
- REQ-1011 [always] The preview header shall offer "Chat" and "Email" views, with Chat as the default.
- REQ-1012 [always] The Chat view shall render the real SupportWidget (phase 18 look: white conversation surface, floating controls, plain AI text, grey customer pills) at 1:1 or scaled to fit (≥0.85). It shows a short resolved exchange (Margaret: "My fedora arrived crushed…", AI reply), then the Chat prompt as an AI message.
- REQ-1013 [always] Below the chat prompt, the widget shall show the first rating question inline in the conversation in the chosen Rating style, as large tappable stars, emoji circles or number pills.
- REQ-1014 [event] When the user taps a rating in the Chat preview, the system shall show the customer's choice as a grey pill and then each remaining question one at a time as AI messages. Choice options show as stacked pills like Home starters, and the text question uses the widget's input pill. The flow ends with the Thank-you message.
- REQ-1015 [always] The Chat view shall offer "Restart preview", which returns to the rating question.
- REQ-1016 [state] While "Inline chat" delivery is off, the Chat view shall show the conversation without a survey, plus the muted note "Chat surveys are off."

### Preview: Email
- REQ-1017 [always] The Email view shall show an email frame with From "Goorin Bros. Support <support@goorin.com>" (from Channels → Email), To "Margaret Okonkwo", the Subject (variables filled), and a "Sent 2 hours after resolution" line that follows Delivery.
- REQ-1018 [always] The email body shall be a light, modern template: GOORIN wordmark on white (no brown header block), the intro with variables filled, the first rating question as one-tap buttons in the Rating style, the signature from Channels → Email, and the footer "You're getting this because you contacted Goorin Bros. support. Unsubscribe from surveys".
- REQ-1019 [always] The Email view shall offer "Email" and "Survey page" sub-views. Survey page shows the browser page the email opens: the chosen rating pre-selected, the remaining questions, the "Send feedback" button and the Thank-you state on submit.
- REQ-1020 [event] When the user taps a rating in the email preview, the system shall switch to "Survey page" with that rating selected.
- REQ-1021 [state] While "Email" delivery is off, the Email view shall show the email greyed out with the note "Email surveys are off."

### Live updates and states
- REQ-1022 [event] When the user edits questions, messages, Rating style or Delivery, both previews shall update on the same keystroke. (no failure mode)
- REQ-1023 [always] Save, Discard and the unsaved guard shall use the shared SaveBar and the "All changes saved" status, as before ("CSAT settings saved").
- REQ-1024 [state] While the screen is narrower than 1024px, the preview shall sit below the settings behind "Show preview". At 390 there's no sideways scroll.
- REQ-1025 [always] The real storefront widget's post-chat survey shall use the same chat prompt, questions, Rating style and thank-you message as the preview.

## Quality requirements
```
Q-874  Tag: Csat.PreviewFidelity
       Scale: visual/style differences between the Chat preview survey and the real widget survey (same settings)
       Meter: scripted DOM/style comparison of key elements (radius, colours, font size)
       Must: 0
       Plan: 0
Q-875  Tag: Csat.PreviewSpeed
       Scale: ms from keystroke to both previews updated
       Meter: browser timing, 5 trials
       Must: 200 (estimate)
       Plan: 50
Q-876  Tag: Csat.Layout
       Scale: px horizontal overflow at 390, 768, 1024, 1280, 1440, 1920
       Meter: width check
       Must: 0
       Plan: 0
Q-877  Tag: Csat.Look
       Scale: reviewer judgement that the previews match the phase-18 chat look and a modern email
       Meter: human (shots of Chat, Email, Survey page at 1440)
       Must: no brown header block, no generic web form look in Chat
       Plan: user calls it modern
```
