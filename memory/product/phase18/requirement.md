# Phase 18 — Channels + Settings refinement, app-wide consistency pass

Version: phase-18

## Goal
The user asked to "refine channels and all pages" and "refine settings pages". Channels and Settings get a real design pass: clear channel status, one layout pattern per tab, no nested cards or slivers, and a tidier Account, Users, Integrations and CSAT. Every other page (Dashboard, Inbox, AI & Workflows, Guidance, Login, 404, No access) gets a consistency sweep against shared rules. Their approved layouts do not change. Frontend-only, mock data through `/src/api` (see `../overview.md`).

## Functional requirements

### App-wide consistency rules (every signed-in page)
- REQ-908 [always] Every signed-in page shall use the shared page header: title, one-line description, actions on the right.
- REQ-909 [always] AI & Workflows, Channels and Settings shall use the same tab component in the same position directly under the header.
- REQ-910 [always] Every editable settings screen shall use the one shared unsaved-changes bar, pinned to the bottom with "Discard" and "Save", that never covers content. (interpreted)
- REQ-911 [always] The saved state shall show as "All changes saved" in the same spot (right end of the tab row) on every editable settings screen. (interpreted)
- REQ-912 [always] Form fields shall have labels above the field, with every field in a section starting at the same left edge. (interpreted)
- REQ-913 [always] Cards shall not use uppercase letter-spaced overlines (for example "LIVE PREVIEW", "RECOMMENDED · APP EMBED", "QUESTION 1"). Sentence case is used instead. (interpreted)
- REQ-914 [always] No card shall have a coloured left edge or sliver. Attention uses a soft amber ring plus a text line. (interpreted)
- REQ-915 [always] No card shall sit inside another card more than one level deep. (interpreted)
- REQ-916 [always] Status chips (Connected, Needs attention, Error, Active, Invited, Deactivated, Live, Off) shall come from one shared component with one colour per meaning.
- REQ-917 [always] The UI shall show none of these leftover terms: "Business hours", "Routing", "Macro", "Settings → AI", "MOCKED". (interpreted)
- REQ-918 [always] Dashboard, Inbox, AI & Workflows and Guidance shall keep their approved layouts. Only rule violations from REQ-908 to REQ-917 are fixed there.

### Channels
- REQ-919 [always] Each Channels tab shall start with a one-line status strip: a status chip, a short fact line and one action.
- REQ-920 [always] The Chat status strip shall read "Live on goorin.myshopify.com · AI replies on" with a "Last loaded 4 minutes ago" fact and the action "Installation".
- REQ-921 [always] The Contact form status strip shall read "Live on /pages/contact · Submissions become email tickets".
- REQ-922 [always] The Email status strip shall show "support@goorin.com via Office 365" with a "Needs attention: Mailbox syncing is turned off." line and the action "Fix in Integrations" to /settings/integrations/outlook.
- REQ-923 [always] The Installation status strip shall show "Chat widget: Installed" and "Contact form: Installed".
- REQ-924 [always] The Email tab shall use the settings column plus sticky preview layout used by Chat and Contact form.
- REQ-925 [always] The Email preview shall show a sample customer email reply with From "<From name> <reply-to>", the AI reply body and the signature filled in for Ava.
- REQ-926 [always] The Email preview shall offer "Reply" and "Auto-acknowledgement" views.
- REQ-927 [event] When the user edits From name, Reply-to, Signature or the acknowledgement text, the system shall update the Email preview on the same keystroke. (no failure mode)
- REQ-928 [unwanted] If Reply-to is not a valid email, then the system shall show "Enter a valid email address." and block Save.
- REQ-929 [always] The Chat preview toggle shall be labelled "Offline" instead of "Outside business hours", and the Display rules setting shall be labelled "When the team is offline" with the same three options (Keep AI on / Show offline form / Hide widget). (interpreted)
- REQ-930 [always] The Installation tab shall show the chat widget and the contact form as numbered setup steps (1, 2, 3), each done step with a green check.
- REQ-931 [always] The script-tag fallback shall sit in a collapsed "Can't use the app embed?" section with the code and a Copy button.
- REQ-932 [event] When the user clicks Copy, the system shall copy the script tag and show "Copied". (no failure mode)
- REQ-933 [always] "Verify installation" shall stay on the Installation tab and return its mock result.
- REQ-934 [always] The Contact form tab shall keep its editor and preview, restyled to REQ-912 to REQ-915.

### Settings
- REQ-935 [always] The Settings description shall change with the tab: Account "Your profile, password and alerts.", Users "Who can use the desk and what they can do.", Integrations "Connections to your mailbox, store, AI and email. Credentials are read-only here.", CSAT "The survey customers get after a ticket is resolved.". (interpreted)
- REQ-936 [always] Account shall use the settings-row layout: section title and description on the left, controls on the right.
- REQ-937 [always] Password fields shall have a show/hide eye button.
- REQ-938 [unwanted] If the new and confirm passwords differ, then the system shall show "Passwords don't match." and not change the password.
- REQ-939 [always] Account Sessions shall list mock sessions: "This browser · Chrome on macOS · Active now", "Safari on iPhone · 2 hours ago" and "Chrome on Windows · 3 days ago". (interpreted)
- REQ-940 [event] When the user confirms "Sign out of all other devices", the system shall show "Signed out of 2 other sessions" and leave only "This browser" in the list.
- REQ-941 [always] Users shall show the summary "3 members · 2 active · 1 invited" above the table.
- REQ-942 [always] An invited user's last-login cell shall read "Invite sent <relative time>" instead of "Never".
- REQ-943 [event] When the user picks "Resend invite" for an invited user, the system shall show "Invite resent to <email>". (no failure mode)
- REQ-944 [always] Users shall show a "What each role can do" card: Admin sees every page including AI & Workflows, Channels and Settings, and Agent sees Dashboard, Inbox and Guidance.
- REQ-945 [always] Integrations tiles shall be grouped under "Inbox & store" (Office 365, Shopify, Loop Returns), "AI models" (Claude, Grokbot) and "Email delivery" (Resend).
- REQ-946 [always] Each integration tile shall show one status chip (Connected, Needs attention, Error or Not connected) and "Checked <relative time>". The separate "Configured" pill is removed.
- REQ-947 [always] The whole integration tile shall be one link with one "Manage" affordance (no second chevron).
- REQ-948 [state] While an integration needs attention or has an error, its tile shall show a soft amber (attention) or red (error) ring and the reason line.
- REQ-949 [always] Integration detail pages shall share one header: back link "All integrations", logo, name, status chip and "Test connection".
- REQ-950 [always] Integration detail pages shall use the settings-row layout for their sections, with secrets masked and read-only.
- REQ-951 [always] CSAT shall keep its question builder and preview, with the preview heading "Preview" and question cards labelled "Question 1" in sentence case.
- REQ-952 [event] When the user saves CSAT changes, the system shall show "CSAT settings saved". (Failure: REQ-953)
- REQ-953 [unwanted] If a question has empty text on Save, then the system shall show "Add the question text." on that card and block Save. (interpreted)

### Phone and tablet
- REQ-954 [state] While the screen is narrower than 1024px, Channels and Settings previews shall move below the settings with a "Show preview" toggle. (interpreted)
- REQ-955 [state] While on a phone (under 640px), the settings-row layout shall stack title, description and controls, and integration tiles shall be one column.

## Quality requirements
```
Q-863  Tag: App.Layout
       Scale: px horizontal overflow on every page and tab
       Meter: width-check script at 390, 768, 1024, 1280, 1440, 1920
       Must: 0
       Plan: 0
Q-864  Tag: App.Consistency
       Scale: violations of REQ-908 to REQ-917 found by a scripted DOM sweep of every route
       Meter: scripts/phase18-check.mjs
       Must: 0
       Plan: 0
Q-865  Tag: Channels.PreviewSpeed
       Scale: ms from keystroke to preview updated (Email, Chat, Contact form)
       Meter: browser timing, 5 trials each
       Must: 200 (estimate)
       Plan: 50
Q-866  Tag: Settings.DataSafety
       Scale: unsaved edits lost without a confirm when leaving a tab or page
       Meter: scripted check on Chat, Contact form, Email, CSAT
       Must: 0
       Plan: 0
Q-867  Tag: App.Accessibility
       Scale: serious/critical axe violations, controls unreachable by keyboard
       Meter: axe + tab pass on Channels and Settings
       Must: 0
       Plan: 0
Q-868  Tag: App.Look
       Scale: reviewer judgement that Channels and Settings match the refined Inbox/Dashboard (white cards, neutral greys, brown only on primary actions, calm spacing)
       Meter: human (screenshots of every tab at 1440 and 390)
       Must: no misaligned fields, nested cards, slivers or uppercase overlines
       Plan: user calls it organized and premium
```
