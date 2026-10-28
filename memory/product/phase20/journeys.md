# Phase 20 journeys — CSAT preview

Seed: Ava Martinez (Admin). Survey: Q1 "How would you rate the help you received?" (rating, required), Q2 "What did we get right?" (choice: Speed, Accuracy, Friendliness, Knew our hats), Q3 "Anything we could do better?" (text). Delivery: Email + Inline chat on, 2 hours after resolution. Rating style: Stars. Preview customer: Margaret Okonkwo, ticket "Fedora arrived crushed". All data is MOCKED.

superseded: the preview part of [JRN-213] (phase 18), and the "Inline survey style" control in Channels → Chat → Display

### JRN-226 Chat preview in the modern widget
- steps: Open Settings → CSAT at 1440. Look at the preview, then tap 4 stars, pick "Knew our hats", type "More wide brims" and send. Click Restart preview.
- expected: The preview shows Chat / Email with Chat selected, rendering the phase-18 widget (white surface, floating controls, plain AI text, grey pills). A short resolved exchange is followed by "Glad that's sorted! Mind rating this chat?" and large tappable stars. Tapping 4 shows a "4 stars" grey pill and then Q2 with stacked option pills. The choice appears as a pill, then Q3 uses the input pill. Sending shows "Thanks, Margaret! Your feedback helps us make better hats and better help.". Restart returns to the rating.

### JRN-227 Email template and survey page
- steps: Switch to Email. Read the frame. Tap 5 in the email. Pick "Speed" on the survey page and click Send feedback. Switch back to "Email".
- expected: From "Goorin Bros. Support <support@goorin.com>", To Margaret Okonkwo, Subject "How did we do, Margaret?", "Sent 2 hours after resolution". The white template has the GOORIN wordmark (no brown block), the intro with "Fedora arrived crushed" filled in, one-tap stars, the signature and the unsubscribe footer. Tapping 5 opens Survey page with 5 selected, the remaining questions and Send feedback, and submitting shows the thank-you.

### JRN-228 Messages template, variables, validation
- steps: In Messages change the Email subject to "Quick question, {first_name}" using the {first_name} chip. Change the Chat prompt. Clear the Chat prompt and Save. Restore it and Save.
- expected: The subject reads "Quick question, Margaret" in the Email view on the same keystroke, and the chat prompt updates in the Chat view. An empty prompt shows "Add a chat prompt." and blocks Save. A valid Save shows "CSAT settings saved" and "All changes saved".

### JRN-229 Rating style and delivery follow through
- steps: Switch Rating style to Emoji, then Numbers. Turn off Inline chat, then Email. Change the delay to 30 minutes. Open Channels → Chat → Display.
- expected: Both previews switch to emoji circles, then number pills. With Inline chat off, Chat shows "Chat surveys are off." With Email off, the email is greyed out with "Email surveys are off." The Email line reads "Sent 30 minutes after resolution". Channels → Chat → Display shows the survey on/off switch plus "Survey questions and style live in Settings → CSAT" (no style control).

### JRN-230 Real widget matches
- steps: Save Rating style Emoji and a custom chat prompt. In Channels → Chat preview (or the storefront widget), end a conversation to trigger the post-chat survey.
- expected: The real widget shows the same prompt, emoji rating, questions and thank-you as the CSAT Chat preview.

### JRN-231 Tablet and phone
- steps: View Settings → CSAT at 1024, 768 and 390, and open Show preview.
- expected: Under 1024 the preview sits below the settings behind Show preview, with Chat / Email working. At 390 nothing scrolls sideways and the widget preview fits the width.
