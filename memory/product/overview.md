# Requirements: Goorin Support Desk (UI/UX prototype)

## Core Value
A fully clickable, front-end-only prototype of an AI-first customer service desk for Goorin Bros. (heritage hat brand, est. 1895). Claude answers first, Grokbot is the second AI tier, humans take over when needed. Everything runs on typed mock data behind a single API layer, so the backend team can later swap the mocks for real endpoints without touching any component.

## Personas & Roles
- **Admin** (support lead): sees everything, including Settings (Integrations, AI, Chat Widget, Users).
- **Agent** (support rep): sees Dashboard, Inbox and Guidance, with full edit rights in Guidance. Cannot see Settings. Opening /settings by URL shows a "No access" screen.
- **Customer** (Goorin shopper): uses the storefront chat widget and the hosted CSAT survey. No login.
- **Backend developer** (handoff reader): uses /styleguide, the README and the mock-to-API contract.
- The role toggle sits in the user menu (Admin / Agent). It switches permissions for the same signed-in user (Ava Martinez).

## Features
| id | feature | persona | phase |
|---|---|---|---|
| F-1 | React + TypeScript + Vite + Tailwind + shadcn/ui + lucide-react + Recharts project. No backend, DB, auth provider or Emergent libs; portable to any React env | Dev | 1 |
| F-2 | Typed mock JSON in /src/mocks; every read/write goes through one async /src/api layer (simulated latency) that returns mocks; components never import mocks directly | Dev | 1 |
| F-3 | /src/theme design tokens + Tailwind config: palette, Fraunces (titles + KPI numbers only) + Inter, 8px grid, 10px radius, 1px borders, minimal shadows; light mode only | All | 1 |
| F-4 | Shared author badges (Customer neutral, Claude brass, Grokbot slate, Agent brown, System gray) and status pills (open, ai_handling, grok_handling, needs_human high-vis amber, resolved, closed), used consistently everywhere | All | 1 |
| F-5 | Designed empty, loading (skeleton) and error states on every data page, plus a floating "demo state" switcher (Live / Loading / Empty / Error) on every page, hidden in production builds | All | 1 (extended each phase) |
| F-6 | Accessibility: WCAG AA contrast, full keyboard navigation, visible focus rings | All | every phase |
| F-7 | App shell: collapsible left sidebar with text "Goorin Bros." wordmark; nav Dashboard, Inbox (needs-human count badge), Guidance, Settings (admin only); top bar with global search, notification bell (needs_human alerts), user menu | Admin, Agent | 1 |
| F-8 | Role toggle in user menu (Admin / Agent); agents cannot see Settings | Admin, Agent | 1 |
| F-9 | Desktop-first, usable down to tablet (768px) | Admin, Agent | every phase |
| F-10 | Login (/login): email + password, forgot-password flow, accept-invite variant; gates the app (mock) | Admin, Agent | 1 |
| F-11 | Dashboard: date-range picker (today, 7d, 30d, 90d, custom); 7 KPI cards with delta vs prior period (open tickets, tickets created, AI resolution rate, first response time, resolution time, CSAT average, CSAT response rate) | Admin, Agent | 1 |
| F-12 | Dashboard charts: volume by channel (email vs chat), resolved-by split (Claude / Grokbot / human), escalation reasons (horizontal bar), top tags | Admin, Agent | 1 |
| F-13 | CSAT section: score trend line, 1–5 distribution, split by channel and by resolver, latest comments feed linking to tickets, low-score list (≤2) with "needs follow-up" flag | Admin, Agent | 1 |
| F-14 | CSAT Settings drawer: drag-to-reorder question builder (rating / text / choice), send delay, channel toggles (email, inline chat), low-score alert recipients, live survey preview | Admin, Agent | 1 |
| F-15 | Global search (tickets, customers, guidance articles), opens with ⌘K / Ctrl+K | Admin, Agent | 1 |
| F-16 | Notification bell listing needs_human tickets, each linking to the ticket | Admin, Agent | 1 |
| F-17 | /styleguide: colors, type scale, buttons, inputs, badges, status pills, cards, tables, empty states (foundations); AI draft card and widget components added later | Dev | 1 + 6 |
| F-18 | Mock data: ~40 tickets (every status, both channels, hat-brand scenarios), Claude/Grokbot/human resolvers, 15 guidance articles, 8 macros, 3 users, 90 days of metrics, CSAT responses with comments | All | 1 |
| F-19 | Inbox 3-pane layout; views All open, Needs human, AI handling, Mine, Unassigned, Resolved, Closed | Admin, Agent | 2 |
| F-20 | Ticket list rows (customer, subject/preview, channel icon, status pill, resolved-by badge, relative time); filters (status, channel, resolved-by, tag, assignee); bulk multi-select assign / tag / close | Admin, Agent | 2 |
| F-21 | Conversation pane: threaded messages with author badges, yellow-tinted internal notes, AI draft cards (confidence meter, guidance used, Approve / Edit / Discard), escalation timeline chip (Claude → Grokbot → Human, reason on hover), header controls for status, priority, assignee | Admin, Agent | 2 |
| F-22 | Composer: rich text, macros picker (/ shortcut), internal-note toggle, send | Admin, Agent | 2 |
| F-23 | Right sidebar: customer card, Shopify orders (status, tracking link, line items), past tickets, collapsible AI attempt log (tier, model, confidence, latency, guidance articles) | Admin, Agent | 2 |
| F-24 | Inbox shortcuts j/k navigate, r reply, n note, e close, shortcut help modal | Admin, Agent | 2 |
| F-25 | Inbox collapses to a single pane on narrow screens | Admin, Agent | 2 |
| F-26 | Guidance Articles: searchable table, category/tag filters, active toggle, last updated; split-view markdown editor with live preview, title, category, tags | Admin, Agent | 3 |
| F-27 | Guidance Macros: list and editor | Admin, Agent | 3 |
| F-28 | Guidance Test Sandbox: sample question + optional order number; retrieved articles with relevance scores, Claude draft reply, confidence gauge, "would escalate to Grokbot" indicator | Admin, Agent | 3 |
| F-29 | Guidance CSV import (dropzone + column-mapping preview) and export | Admin, Agent | 3 |
| F-30 | Settings → Integrations: cards for Outlook, Shopify, Claude, Grokbot, Resend with logo placeholder, status, last sync, Test connection, expandable details; secrets masked + read-only ("from env vars") | Admin | 3 |
| F-31 | Settings → AI: confidence threshold slider, auto-send matrix (channel × tier), business hours editor, escalation rules, read-only system prompt viewer | Admin | 3 |
| F-32 | Settings → Users: table (name, email, role, status, last login), invite modal (email, role), change role / deactivate / reset password | Admin | 3 |
| F-33 | Customer chat widget component rendered in Shadow DOM, with all states: launcher + unread badge, proactive greeting, panel header (logo, title, AI disclosure, minimize), pre-chat form (auto-skipped for logged-in customer), conversation (bubbles + avatars, typing indicator, quick-reply chips, inline order card), handoff, offline email form, inline CSAT, transcript confirmation | Customer | 4 |
| F-34 | /widget-demo: full-page mock Goorin storefront with the live widget and every state clickable; mobile full-screen sheet with safe-area composer; focus trap, Esc to close, ARIA live region | Customer | 4 |
| F-35 | Hosted CSAT survey /survey/:token: branded header, one question per step, progress bar, mobile-first, thank-you state | Customer | 4 |
| F-36 | Settings → Chat Widget (/settings/widget): two-column layout, sticky live preview (storefront variant product/collection/cart, device desktop/tablet/mobile iPhone frame, 8 states), instant updates, unsaved-changes bar, "Preview on my store" | Admin | 5 |
| F-37 | Widget Branding, Launcher, Messaging, Display rules, CSAT-in-chat sections (every field in the brief) | Admin | 5 |
| F-38 | Widget Install (Shopify): status card, App Embed step card + "Open Theme Editor" + toggle illustration, script-tag fallback snippet, source indicator, "Verify installation" | Admin | 5 |
| F-39 | Shopify Theme Editor mock (/widget-demo/theme-editor) styled like Shopify admin | Admin | 5 |
| F-40 | README: every component listed + mock-to-API contract; Shadow DOM approach documented; styleguide completed (AI draft card, widget components); final accessibility + tablet audit | Dev | 6 |
| F-41 | Phone-optimized agent app (<640px): bottom tab bar, phone top bar, bottom sheets, phone layouts for Dashboard, Inbox, Guidance, Settings (user request, extends 'usable down to tablet') | Admin, Agent | 7 |
| F-42 | Modern Inbox layout: Inbox views panel (Default / Shared / Private views), main sidebar shrinks to icons on Inbox, ticket card list, breadcrumb header with team, snooze and prev/next | Admin, Agent | 10 |
| F-43 | Saved views: save the current filters as a Private or Shared view; rename, share, duplicate, delete | Admin, Agent | 10 |
| F-44 | Conversation AI context: message cards with copy, "Show reasoning", Handover summary + Handover reason with source icons, event lines | Admin, Agent | 10 |
| F-45 | Power composer: channel/To row, macro search, suggested macros, toolbar with Translate, Send / Send & Resolve, keyboard tips | Admin, Agent | 10 |
| F-46 | Stacked right panel with icon rail: Ticket details + fields, customer card + note, past tickets, Shopify (store selector, metafields, purchase summary, order cards), Loop | Admin, Agent | 10 |
| F-47 | Mock Shopify order dialogs: Edit, Duplicate, Refund, Create order, each with a confirmation | Admin, Agent | 10 |
| F-48 | "Ask Goorin AI" assistant (⌘G): ticket-aware mock answers with sources and "Insert into reply" | Admin, Agent | 10 |
| F-49 | AI-first Inbox: opens on "Needs you" (only AI handovers), separate "AI handling" monitor view with "<n> handled by AI today" + Take over, hand back to AI | Admin, Agent | 11 |
| F-50 | AI-draft-first reply: Approve & send / Edit / Write my own, "Why you're here" brief, compact thread | Admin, Agent | 11 |
| F-51 | Compact summary panel (customer, latest order, returns, risk) expanding to full details; enterprise-neutral Inbox styling | Admin, Agent | 11 |
| F-52 | Simpler Dashboard: 5 KPIs with text deltas, volume + Resolved by pair, slim chat timing, tabbed "Why tickets reach a person", Refunds/Fraud top 3 + View all sheet, one tabbed CSAT card | Admin, Agent | 12 |
| F-53 | Workflows as process automations: list with stats, create many (blank or template), on/off, duplicate, delete, validation | Admin | 13 |
| F-54 | Workflow editor with List and drag-and-drop Canvas views (same data), triggers by AI intent on chat / contact form / email, step library (messages, questions, email code, Shopify, Loop, conditions, hand over) | Admin | 13 |
| F-55 | Order tracking workflow (email → 6-digit code → orders + tracking) + templates: Start a return (Loop), Change shipping address, Wholesale inquiry, Hat size finder; Test workflow with chat preview + mock inbox; runs in /widget-demo | Admin, Customer | 13 |
| F-56 | Routing tab (escalation rules, business hours, assignment) and refined AI & Workflows page design | Admin | 13 |
| F-57 | Chat widget redesign to match the reference: frosted panel, floating Cart / Track orders / Close, stacked conversation starters, "Ask anything" pill input, bubble-less AI replies with thumbs feedback, round launcher | Customer | 14 |
| F-58 | Channels page cleanup: one tab level, compact settings column + sticky store-backdrop preview, Home screen settings with conversation starters editor (ask AI / start workflow / open link) | Admin | 14 |
| F-59 | AI & Workflows design pass: Routing removed; Brand voice live voice preview; AI replies impact strip + threshold estimate; Workflows table + template preview + editor polish; Conversation testing with customer picker, insight rows, Run all scenarios | Admin | 15 |
| F-60 | 8 real workflows replacing templates: Order tracking, Start a return (Loop), Change shipping address, Cancel an order, Damaged item claim, Wholesale inquiry, Hat size finder, Friday Drops & restock alerts (Needs setup) | Admin, Customer | 16 |
| F-61 | New workflow step types: pick order/items, address form, photo upload, consent, inventory, cancel, replacement, refund (limit-aware), discount code, send email, wait, run another workflow, add to email list | Admin | 16 |
| F-62 | Draft/publish with versions (restore, change summary) and run history per workflow (stats, funnel, runs table, run detail linked to Inbox, step stats overlay) | Admin | 16 |
| F-63 | Guidance refinement: no tabs, one New article + Import / export menu, summary counts, category list with counts, status/tag/sort filters, readable rows (excerpt, relative updated, AI uses), two-column editor with toolbar + chip tags + settings panel, stepped CSV import | Admin, Agent | 17 |
| F-64 | Channels refinement: status strip per tab, Email settings + live email preview, numbered Installation steps with collapsed script fallback, offline wording | Admin | 18 |
| F-65 | Settings refinement: per-tab descriptions, Account rows + password eye + sessions list, Users summary + resend invite + roles card, grouped Integrations with one status each and shared detail header, CSAT tidy | Admin | 18 |
| F-66 | App-wide consistency sweep: shared header/tabs/save bar/status chips, labels above fields, no overlines/slivers/nested cards, leftover-term clean-up | Admin, Agent | 18 |
| F-67 | Conversation testing workspace: setup rail, Inbox-style test chat, inspector (confidence vs threshold, decision, sources, order, workflow it would start), scenario cards, run-all scorecard | Admin | 19 |
| F-68 | CSAT preview: Chat view in the modern widget (conversational survey) + Email view (modern template + survey page), editable Messages template with variables, rating style owned by CSAT for both channels | Admin | 20 |

## Phases
- **Phase 1: Foundation + Dashboard.** Gets the Vite/TS project, tokens, shell, login, mock data + API layer, Dashboard and CSAT drawer, and styleguide foundations working. Delivers F-1 to F-18. [requirement](phase1/requirement.md) · [journeys](phase1/journeys.md)
- **Phase 2: Inbox.** The full agent workspace. Delivers F-19 to F-25.
- **Phase 3: Guidance + Settings (Integrations, AI, Users).** Delivers F-26 to F-32.
- **Phase 4: Customer-facing widget + survey.** The widget component in every state, /widget-demo, hosted survey. Delivers F-33 to F-35.
- **Phase 5: Chat Widget settings + Theme Editor mock.** Delivers F-36 to F-39.
- **Phase 6: Handoff.** Finished styleguide, README contract, accessibility/tablet audit. Delivers F-40.
- **Phase 7: Phones.** The whole agent app optimized for 360–430px phones. Delivers F-41. [requirement](phase7/requirement.md) · [journeys](phase7/journeys.md)
- **Phase 8: Refunds, fraud, integrations tiles, customer panel.** [requirement](phase8/requirement.md) · [journeys](phase8/journeys.md)
- **Phase 9: Production-parity restructure** (AI & Workflows, Channels, Settings tabs, Inbox update). [requirement](phase9/requirement.md) · [journeys](phase9/journeys.md)
- **Phase 10: Modern Inbox** from the user's Gorgias-style screenshots. Delivers F-42 to F-48. [requirement](phase10/requirement.md) · [journeys](phase10/journeys.md)
- **Phase 11: AI-first Inbox, simplified.** Needs-you-first, AI draft first, summary panel, enterprise-neutral look; fixes Phase 10 test failures. Delivers F-49 to F-51. [requirement](phase11/requirement.md) · [journeys](phase11/journeys.md)
- **Phase 12: Simpler Dashboard.** 5 KPIs, paired blocks, tabbed cards, top-3 + View all. Delivers F-52. [requirement](phase12/requirement.md) · [journeys](phase12/journeys.md)
- **Phase 13: AI & Workflows refresh + Workflows automation.** Multiple workflows, List + Canvas editor, Order tracking with email-code verification, 4 templates, Routing tab, Test workflow with mock inbox, widget runtime. Delivers F-53 to F-56. [requirement](phase13/requirement.md) · [journeys](phase13/journeys.md)
- **Phase 14: Chat widget redesign + Channels chat settings.** Frosted panel, floating Cart / Track orders / Close, stacked starters, pill input, plain AI replies with thumbs, round launcher; one tab level, compact settings + sticky preview, starters editor. Delivers F-57 and F-58. [requirement](phase14/requirement.md) · [journeys](phase14/journeys.md)
- **Phase 15: AI & Workflows design pass.** Routing removed; Brand voice live preview, AI replies impact strip + estimate, Workflows table/templates/editor polish, Conversation testing with customer picker, insight rows and Run all. Delivers F-59. [requirement](phase15/requirement.md) · [journeys](phase15/journeys.md)
- **Phase 16: Workflows build-out.** Templates removed; 8 real workflows (Order tracking, Return, Address change, Cancel, Damaged claim, Wholesale, Hat size, Restock alerts); 14 new step types; draft/publish with versions; run history with funnel and run detail. Delivers F-60 to F-62. [requirement](phase16/requirement.md) · [journeys](phase16/journeys.md)
- **Phase 17: Guidance refinement.** One organized article library with categories, counts, AI usage, calmer editor and stepped import. Delivers F-63. [requirement](phase17/requirement.md) · [journeys](phase17/journeys.md)
- **Phase 18: Channels + Settings refinement, app-wide consistency.** Delivers F-64 to F-66. Runs before Phase 16. [requirement](phase18/requirement.md) · [journeys](phase18/journeys.md)
- **Phase 19: Conversation testing UI.** Delivers F-67. [requirement](phase19/requirement.md) · [journeys](phase19/journeys.md)
- **Phase 20: CSAT preview — Chat + Email templates.** Delivers F-68. [requirement](phase20/requirement.md) · [journeys](phase20/journeys.md)

## UI/UX Rules
- Light mode only. Heritage-craft warmth with modern SaaS usability, not corporate blue.
- Tokens: background #FAF8F5, surfaces white, text charcoal #1F1D1A, primary tobacco #6B4F3A, accent muted brass #B08D57; status muted green / amber / red / slate.
- Typography is all sans: page titles in Inter Display (600, tight tracking), Inter everywhere else, numbers in Inter with tabular figures. User feedback removed the serif titles and KPI numbers from the original brief for a modern look.
- 8px spacing grid, 10px radius, subtle 1px borders, minimal shadows, generous whitespace.
- Author badges and status pills always come from the shared components and are never restyled locally.
- needs_human is always the highest-visibility (amber) status.
- Every data page has designed skeleton, empty and error states, all reachable via the demo state switcher.
- WCAG AA contrast, every control keyboard-reachable, visible focus rings, drawers and modals trap focus and close on Esc.
- Desktop-first; nothing breaks or scrolls horizontally at 768px. Phone layouts (<640px) are first-class from phase 7.
- Copy speaks the Goorin voice: warm, a little old-world, never cutesy.

## Integrations
No real integrations. Everything is MOCKED on purpose (UI/UX-only scope).
| service shown in UI | how it behaves in prototype |
|---|---|
| Outlook (support@goorin.com), Shopify, Claude, Grokbot, Resend | Mock status cards/details from /src/api; "Test connection", "Send test email", "Verify installation" return mock success/fail results |
| Claude / Grokbot models | Mock model lists (e.g. claude-sonnet-5-5, claude-opus-5-5, claude-haiku-4-5, grok-4.7); test prompts return canned replies |
| Auth | Mock login. Any valid email + non-empty password signs in as Ava Martinez; error@goorin.com triggers the error state |
| Product imagery | AI-generated hat product photos saved as static assets inside the repo (portable) |

## Edge Cases
- Mock data resets to the originals on every page reload. The sign-in session and the selected role survive a reload (sessionStorage) so reviewers aren't logged out (interpreted).
- All mock dates are relative to "now", so data always looks current.
- An agent opening /settings by URL gets a "No access" screen, not a blank page or redirect loop.
- Time-based KPIs (first response, resolution time) show a decrease as good (green).
- A custom date range is limited to the 90 days of available data.
- /styleguide, /widget-demo, /widget-demo/theme-editor and /survey/:token are public. Everything else requires sign-in (interpreted).
- An unknown route shows a designed 404 linking back to Dashboard.
- The demo state switcher is visible in dev/preview and hidden in production builds unless VITE_DEMO_TOOLS=true (interpreted).
- "Preview on my store" opens /widget-demo?desk_preview=1 in a new tab with the current unsaved settings (no real store).
- Theme Editor mock and Chat Widget settings share mock state. Desk settings override theme defaults, and the source indicator shows which one is active.

## Seed Data
Seeding is explicit scope. All of it lives in /src/mocks:
- ~40 tickets (IDs like GB-1042) covering all 6 statuses and both channels (email, chat). Scenarios: sizing, order status, returns, damaged items, custom orders, wholesale inquiries. Resolvers mix Claude, Grokbot and human.
- Messages per ticket (customer / claude / grokbot / agent / system, some internal notes), AI attempts per ticket, AI drafts awaiting approval on some needs_human tickets.
- Customers with Shopify orders (status, tracking, line items).
- 15 guidance articles in 6 categories, each with a mock "AI uses in 30 days" count (phase 17). Macros were removed entirely (REQ-856).
- 3 users: Ava Martinez (Admin, active, ava@goorin.com), Sam Okafor (Agent, active), Priya Shah (Agent, invited).
- 90 days of daily dashboard metrics, CSAT survey config + responses with comments (including scores ≤2).
- Phase 3+: integration statuses, AI settings. Phase 4/5: widget settings, Shopify install status.
