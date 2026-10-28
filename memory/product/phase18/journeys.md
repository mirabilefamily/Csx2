# Phase 18 journeys — Channels, Settings, consistency

Seed: Ava Martinez (Admin). Integrations: Office 365 needs attention (mailbox syncing off), Grokbot error (401 Unauthorized), the others connected. Users: Ava and Sam active, Priya invited. Shopify store goorin.myshopify.com, widget last loaded 4 minutes ago, contact form live on /pages/contact.

### JRN-206 Channels status strips
- steps: Open Channels and visit Chat, Contact form, Email, Installation.
- expected: Each tab starts with one status strip. Chat: "Live on goorin.myshopify.com · AI replies on", "Last loaded 4 minutes ago", action "Installation". Contact form: "Live on /pages/contact · Submissions become email tickets". Email: "support@goorin.com via Office 365", "Needs attention: Mailbox syncing is turned off." and "Fix in Integrations" opening the Office 365 detail. Installation: "Chat widget: Installed" and "Contact form: Installed".

### JRN-207 Email tab with live preview
- steps: Open Channels → Email. Change From name to "Goorin Hat Shop". Type "Thanks for writing" into the signature. Switch the preview to "Auto-acknowledgement". Set Reply-to to "nope", Save. Fix it, Save.
- expected: Settings on the left, sticky preview on the right. The preview shows From "Goorin Hat Shop <support@goorin.com>", the reply body and the signature with Ava's name, and updates on each keystroke. Auto-acknowledgement shows the acknowledgement message. "nope" shows "Enter a valid email address." and Save is blocked. The shared bottom bar shows "Discard" / "Save". After a valid Save the tab row shows "All changes saved".

### JRN-208 Chat tab keeps working
- superseded: the "Outside business hours" toggle label in [JRN-171] and phase-4 offline journeys
- steps: Open Channels → Chat. Change the primary colour. Flip the preview's "Offline" toggle. Leave for Settings without saving.
- expected: The phase 14 layout and preview behaviour still hold. The toggle reads "Offline" and shows the offline state. Leaving asks to discard unsaved changes.

### JRN-209 Installation steps
- steps: Open Channels → Installation. Expand "Can't use the app embed?". Click Copy. Click "Verify installation".
- expected: The chat widget and contact form show as numbered steps 1, 2, 3 with green checks on done steps, with no card inside a card inside a card. The fallback is collapsed until opened, shows the script tag, and Copy shows "Copied". Verify returns its mock result. No "RECOMMENDED · APP EMBED" style overline.

### JRN-210 Settings descriptions + Account
- superseded: the subtitle part of [JRN-121]
- steps: Visit Settings → Account, Users, Integrations, CSAT and read the description each time. On Account, type a password and click the eye. Enter a mismatched confirm, submit. Then submit valid passwords (current: goorin123). Open Sessions → "Sign out of all other devices" → confirm.
- expected: The descriptions read "Your profile, password and alerts." / "Who can use the desk and what they can do." / "Connections to your mailbox, store, AI and email. Credentials are read-only here." / "The survey customers get after a ticket is resolved.". Account sections use the title-left, controls-right rows with aligned fields. The eye shows and hides the password. A mismatch shows "Passwords don't match.", then a success toast. Sessions list 3 sessions, and confirm shows "Signed out of 2 other sessions", leaving "This browser · Chrome on macOS · Active now".

### JRN-211 Users
- superseded: the "Priya 'Never'" part of [JRN-56]
- steps: Open Settings → Users. Read the summary and Priya's row. Open Priya's actions → Resend invite. Read the roles card. Invite "lee@goorin.com" as Agent.
- expected: "3 members · 2 active · 1 invited". Priya's last login reads "Invite sent <relative time>". "Invite resent to priya@goorin.com". The "What each role can do" card lists Admin (every page incl. AI & Workflows, Channels, Settings) and Agent (Dashboard, Inbox, Guidance). The invite still works and the summary becomes "4 members · 2 active · 2 invited".

### JRN-212 Integrations grouped, one status each
- superseded: the tile part of [JRN-121] (Configured pill, amber edge) and the matching part of [JRN-104]
- steps: Open Settings → Integrations. Hover/focus each tile. Open Office 365, go back, open Grokbot.
- expected: Groups "Inbox & store" (Office 365, Shopify, Loop Returns), "AI models" (Claude, Grokbot), "Email delivery" (Resend). Each tile has one status chip and "Checked <relative time>", no "Configured" pill, no left edge, one "Manage" affordance and the whole tile clickable. Office 365 has a soft amber ring plus "Needs attention: Mailbox syncing is turned off.". Grokbot has a soft red ring plus "401 Unauthorized". Detail pages share the header (All integrations · logo · name · status · Test connection) and settings rows with masked read-only secrets.

### JRN-213 CSAT
- steps: Open Settings → CSAT. Clear question 1's text, Save. Restore it, reorder question 2 up, Save.
- expected: Cards read "Question 1" etc. in sentence case and the preview heading is "Preview". Empty text shows "Add the question text." and blocks Save. A valid Save shows "CSAT settings saved" and the preview order matches. (interpreted)

### JRN-214 App-wide consistency sweep
- steps: Visit every signed-in route: Dashboard, Inbox (Needs you + a ticket), AI & Workflows (all tabs), Guidance (list + editor), Channels (all tabs), Settings (all tabs + one integration detail), the No access screen as Agent, and a 404.
- expected: Same page header on each. The same tab component on AI & Workflows, Channels and Settings. No uppercase letter-spaced overlines on cards, no coloured left slivers, no triple-nested cards, labels above fields, and the same status chip colours. None of "Business hours", "Routing", "Macro", "Settings → AI", "MOCKED" appear. Dashboard and Inbox layouts look as approved.

### JRN-215 Tablet and phone
- steps: View Channels (all tabs) and Settings (all tabs + Office 365 detail) at 1024, 768 and 390.
- expected: Under 1024 previews move below the settings with a "Show preview" toggle. At 390 settings rows stack, integration tiles are one column, and nothing scrolls sideways. Phone navigation reaches Channels and Settings through More.

### JRN-216 Settings and forms fill the page
- steps: At 1440 and 1920 open Channels → Chat, Contact form and Email, Settings → Account and CSAT, AI & Workflows → Brand voice, and the Office 365 detail.
- expected: Settings column plus preview span the full content width, with one 24–32px gap and no empty middle band. The preview's right edge lines up with the status strip. Inputs and textareas in a card share one right edge (Contact form Heading and Intro are the same width, or Heading sits beside Button label). Account's password, notifications and sessions reach the card's right padding. No sideways scroll at 1024, 768 or 390.

### JRN-217 Chat widget matches the reference look
- superseded: the Home greeting block and conversation styling in [JRN-171] / phase-14 widget journeys
- steps: Open Channels → Chat preview at 1920×1080 and 1440×900. Go to Conversation, send "test", then "can you help me cancel my order". Thumb-up the AI reply. Scroll up in the thread. Type in the input.
- expected: Home is a tall frosted warm panel (~720px at 1920×1080, 1:1) with no header bar and no greeting. Cart, Track orders and Close float top-right. Starters are translucent light pills stacked at the bottom-left, ending with "See last conversation", above a light "Ask anything" pill with an attach-image icon and "AI notice • Privacy" below. Conversation switches to a near-white surface with a large radius and soft shadow. Back, Cart, Track orders and Close float as white pills over the list, with a soft top fade. AI text is plain 16px with no bubble, and customer messages are right-aligned light-grey pills. The chosen thumb turns into a filled dark circle. Scrolling up shows a round "scroll to latest" arrow. The input is a floating white pill: "Reply", attach-image icon, and a send arrow once typing. "AI notice • Privacy" sits centred below. The real storefront widget looks the same.

### JRN-218 Inbox reply sits at the end of the thread
- steps: At 1440 open GB-1076 (Needs you, with an AI draft). Scroll up to the first message. Click the floating "Reply" pill. Click "Write my own", type, then send. Open an AI-handling ticket. Repeat on a phone at 390.
- expected: On open, the thread is at the bottom with the draft card right after the last message, the same width as the messages, and not a fixed dock. Scrolling up hides it and shows a floating "Reply" pill, which scrolls back to the composer and focuses it. The composer grows in place, and after sending, the new message appears above it. The AI-handling Take over bar also sits at the end of the thread. At 390 the composer stays docked at the bottom.
