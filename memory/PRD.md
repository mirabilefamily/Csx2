# PRD: Goorin Support Desk (UI/UX prototype)

## Original problem statement
Phase 1 build brief: front-end-only clickable prototype of an AI-first support desk for Goorin Bros. (heritage hat brand). React 19 + TS + Vite + Tailwind + shadcn/ui + lucide-react + Recharts. No backend, DB, auth provider or Emergent packages. All data typed mocks behind a single async /src/api layer. Full scope in /app/memory/product/overview.md, phase1/requirement.md (REQ-1..94, Q-1..Q-9 hard quality bars), phase1/journeys.md (JRN-1..26).

## Personas
Admin (support lead), Agent (support rep), Customer (later phases), Backend developer (handoff via README + /styleguide).

## Architecture
- /app/frontend only. Vite dev server on 0.0.0.0:3000 (`yarn start`), `allowedHosts: true`.
- src/api (only importer of src/mocks) → request() wrapper with 300–700ms latency + global demo state (live/loading/empty/error).
- src/mocks: 40 tickets, messages, AI attempts, 3 AI drafts, 20 customers + Shopify orders, 15 articles, 8 macros, 3 users, 180 days metrics, CSAT survey + responses. Timestamps relative to now; resets on reload.
- src/theme/tokens.ts → tailwind.config.ts (colors fully overridden, no default blue), charts, styleguide.
- Session + role in sessionStorage.

## Implemented (Phase 1, Oct 2026)
- Login (sign in, validation, error@goorin.com, forgot password, invite + expired invite)
- App shell: collapsible sidebar w/ needs-human badge, ⌘K/Ctrl+K grouped search, notification bell, user menu w/ role toggle + sign out, no-access screen, placeholders, 404
- Dashboard: date range (Today/7d/30d/90d/Custom ≤90d), 7 KPI cards with prior-period deltas, 4 charts, CSAT section (trend, distribution, by channel, by resolver, comments, low scores)
- CSAT settings drawer: dnd-kit + keyboard reorder, rating/text/choice, validation, send delay, channel toggles + paused warning, recipient chips, live preview, save toast, discard guard
- Demo state switcher on every page; /styleguide foundations; README with API contract
- Testing agent iteration 1: 25/26 journeys pass, only a Recharts console warning (fixed)

## Implemented (Phase 2 Inbox, Oct 2026)
- /inbox/:ticketId? 3-pane + details sidebar, 7 views with live counts + ?view= URL; one ticket store feeds views, list, nav badge and bell
- Rows, filters popover (status/channel/resolved-by/tag/assignee), bulk Assign/Tag/Close with exact toasts and an error toast
- Conversation: author-styled thread, yellow internal notes, Claude/Grokbot draft cards (Approve/Edit/Discard+Undo), escalation chip with hover/focus reasons, header status/priority/assignee that add System messages
- Tiptap composer (bold, italic, link, bullets), "/" + button macro picker with placeholder fill, reply/internal-note modes
- Right sidebar: customer card, Shopify orders, past tickets, collapsible AI attempt log
- Shortcuts j/k/r/n/e/? with help modal; responsive (≥1440 side by side, 1024–1439 Details toggle, <1024 single pane + Back + views dropdown)
- Fixed REQ-154: ⌘K after a bell click no longer loses focus
- Testing agent iteration 2: 17/18 journeys passed. JRN-31 couldn't be reached from the UI and was fixed afterwards: the list now stays visible with an error banner when a refresh fails

## Backlog
- P0 Phase 3: Guidance (articles, macros, sandbox, CSV) + Settings (Integrations, AI, Users)
- P1 Phase 4: chat widget (Shadow DOM) + /widget-demo + /survey/:token
- P2 Phase 5: Chat Widget settings + Theme Editor mock; Phase 6: README/styleguide finalization, a11y audit


## Phase 3 — Guidance + Settings (Oct 2026) — DONE
- Guidance: Articles (search/filters/active toggle, markdown editor + live preview, validation, unsaved guard, ?article= deep link), Macros (editor, placeholders, sample preview, shared with Inbox / picker), Test Sandbox (deterministic retrieval, confidence vs saved threshold, order lookup), CSV import/export.
- Settings: /settings -> /settings/integrations; Integrations (5 mock cards, masked secrets + env var names), AI (threshold, auto-send matrix, hours, rules, prompts, unsaved bar), Widget placeholder, Users (invite/role/deactivate/reset, self-protection).
- REQ-223: GB-1076 conversation 552px at 1440.
- Testing: iteration_3 13/14 pass; JRN-56 flags re-verified manually (duplicate invite error + toasts shown).



## Phase 4 — Customer widget + hosted survey (Oct 2026) — DONE
- SupportWidget (Shadow DOM, settings-driven, live/contained modes, 8 forced states), full WidgetSettings + ShopifyInstallStatus types/mocks via /src/api.
- /widget-demo storefront (Product/Collection/Cart, 8 AI hat photos + hero + lifestyle in /public/images), demo controls (state jumps, logged-in, outside hours, hostile CSS, docked demo switcher).
- /survey/:token hosted CSAT (tok_GB1066 valid, done, invalid), follows CSAT Settings via sessionStorage.
- Testing: iteration_4 14/15 auto + JRN-73 manually verified (Step 1 of 4 after adding question).

## Backlog
- P1 Phase 6: styleguide completion, README contract, a11y/tablet audit


## Phase 5 — Chat Widget settings + Shopify theme editor + design refresh (Oct 2026) — DONE
- /settings/widget: 6 collapsible sections, live preview (real SupportWidget, contained, 8 states, Desktop/Tablet/iPhone frames, hidden-by-rules overlays), WCAG contrast warnings, uploads via object URLs, dnd quick replies, unsaved bar + guard, Preview on my store (one-shot localStorage hand-off).
- Install: status card, App embed step, script snippet (VITE_APP_BASE_URL), per-field source (Desk vs Theme), Verify driven by embed status. /widget-demo/theme-editor Shopify-style mock.
- Design refresh: centered login card with GOORIN wordmark; modern dashboard (KPI strip w/ sparklines, volume area chart, stacked resolved-by bar, ranked lists, condensed CSAT w/ tabs); light sidebar restyle (castle tile collapsed, wordmark expanded, brass active bar on tile, edge toggle tab); favicon castle on brass.
- Testing: iteration_5 15/15, iteration_6 sidebar/brand regression all pass; later header/indicator/favicon tweaks verified via screenshots.

## Implemented (Phases 5–6, Oct 2026)
- Phase 5: Chat Widget settings (/settings/widget), Shopify Theme Editor mock, login/dashboard refresh, light sidebar (toggle in bottom section, white castle tile, centered 160px wordmark), Settings redesign (tab bar, integration health, AI form sections, users search, widget section summaries), preview font inherit fix.
- Phase 6 handoff: /styleguide updated with sticky index + real-component specimens (drafts, chip, note, composer, 15 SupportWidget Shadow DOM instances, dashboard, nav, segmented, integration card, form section); README full backend contract (verified by scripts/check-readme.mjs, 0 missing); a11y audit scripts/audit.mjs: axe serious/critical 20 → 0 on 14 routes, 0 overflow at 768/1024, 0 console errors.
- Phase 7 fixes (Sep 2026): the integration tile shows the saved model. The leave guard now covers every internal link click (back link, tabs, bottom bar) and browser Back (popstate).
- Phase 8 (Sep 2026): Refund tracker + Fraud alerts on the Dashboard (MOCKED via refundsApi), Inbox shield + conversation banner, Settings → AI Auto-refunds ($0–500, default $75).
- Phase 8 design refresh: Inter Variable tabular numbers via `Num` with muted units. Fraunces Variable (SOFT 0, WONK 0) is used for page titles only. Phones get a large-title top bar and a full-width 7th KPI tile.
- Iteration 10 (Sep 2026): KPI labels wrap to 2 lines with no ellipsis. The phone tab bar hides in the article/macro editors and CSV import. Instrument Serif page titles, with a dev Title font picker (lazy-loaded alternates). Cleaner login (no glow or icons, minimal card, Inter heading).
- Iteration 11 (Sep 2026): No serif anywhere. Page titles are Inter Display 600 at 28/24px; the dev picker offers Inter Display, Geist, Manrope and Plus Jakarta Sans. The chat widget moved into Shopify (Overview / Chat widget / Install sub-tabs), and /settings/widget redirects there. Settings tabs are now Integrations, AI, Users.
- Iteration 12 (Sep 2026): Inbox customer & Shopify panel. At ≥1024px it's always visible on the right, open by default, and collapses to a rail (session-persisted). It shows the customer header with tags, a stats row, rich order cards (payment/fulfillment pills, line items with photos, ship-to, tracking, View in Shopify MOCKED), plus the guest and fraud chip states. The views pane becomes a dropdown below 1440px so the conversation stays ≥480px.
- Iteration 13 (Sep 2026): Official Shopify bag mark on the Shopify tile, detail header, inbox orders heading, View in Shopify links, Install status card, theme-editor source badges and the theme editor top bar. Header logo thumbnail now uses the header color. New Loop Returns section in the customer panel (MOCKED loopApi): wordmark, stats, High return rate chip, return cards, View in Loop, empty state, rail count.






## Backlog
- P2: real widget.js bundle (Vite IIFE entry), real backend swap per README section 7.

## Phase 9 (Sep 2026): production IA restructure
- New IA: Dashboard, Inbox | AI & Workflows (/ai: voice, replies, workflows, testing), Guidance, Channels (/channels: chat & form, email, install) | Settings (account, users, integrations, csat). Phone More sheet.
- Inbox: Spam/Trash, + New ticket, short ids, pagination, Assign me / Resolve, AI replied banner, Email timing, delivery timeline, Reply/Internal note tabs, collapsible Customer & Shopify panel with order tools and Loop filters.
- Integrations: Office 365 (id outlook), Loop Returns added, Configured/Connected/attention states. Fraud review notes.
- Checks: scripts/phase9-check.mjs; shots in /app/memory/shots/phase9/.

## Phases 11–13 (Sep 2026) — DONE
- Phase 11 Inbox: AI-first Needs you / AI handling, shared app tokens (no Inbox-only palette), calmer view rows + StatusPill, GOORIN | Support Desk lockup, summary collapse rail (]), USD formatter, thread spacing, single Shopify store, cleanup pass REQ-709..716 (56px headers, 2-row conversation header + SLA chip, brief first, hover checkboxes, 4-line draft preview, full-details replaces summary).
- Phase 12 Dashboard rev 2: header + 5 KPIs + strict 2x2 equal cards (Ticket volume, AI performance tabs, Refunds & fraud tabs with View all sheets, Customer satisfaction).
- Phase 13 AI & Workflows: workflowsApi (MOCKED), Order tracking (Active) + 4 templates, List + React Flow Canvas editor on one model, validation, Test panel with mock inbox/code flow, Routing tab, widget runtime on /widget-demo.
- Checks: tsc, build, audit, phone-sweep, width-check, phase8/9/11/12/13, check-readme all pass.

## Phases 14–18 (Sep 2026) — DONE
- Phase 14 Channels: chat-only widget preview (no storefront), deterministic open preview states, outside-hours control.
- REQ-805: Routing removed from AI & Workflows (/ai/routing → /ai/workflows). REQ-827: no Grokbot on AI replies / Conversation testing (below threshold → "Hand to a person"). REQ-856: macros removed from Guidance and the Inbox composer. Channels icon = MessagesSquare.
- Phase 15 AI & Workflows design pass + polish (shared AiCard, one SaveBar, threshold 75 single source, auto-refund limit shared with Inbox/Dashboard).
- Phase 17 Guidance: no tabs, Import/export menu, category rail, filters/sort, clean excerpts, AI-uses count, 2-column editor, 3-step CSV import.
- Phase 18 Channels + Settings + consistency: StatusChip, PreviewPane ("Show preview" under 1024), Channels status strips, Email preview, Installation steps, per-tab Settings descriptions, Account eye + sessions, Users summary/resend/roles card, grouped integration tiles with rings, CSAT copy, "All changes saved" in the tab row, block labels, no overlines. phase18-check (JRN-206..215 + DOM sweep) ALL PASS.
- Phase 16 Workflows build-out: 8 seeded workflows (7 On, Friday Drops & restock Off / needs setup), 14 new step types with Success/Failed paths, draft → publish with notes, versions with restore, live widget runs only the published version, Runs tab (stats, funnel, runs table, run detail, GB-1076 link + Inbox event line), run stats on List. phase16-check (JRN-184..193) ALL PASS.

## Backlog
- P1: Map Phase 13 strictly to REQ-717..759 / JRN-156..166
- P1: Free move (not swap) reorder in List view; inline rename instead of prompt
- P2: Order cards in widget runtime; verify Channels chat preview runtime
- P0 next: Phase 16 follow-ups (multi-item pick with quantity, run stats on Canvas, real photo picker in the widget)
- P1: Script the unsaved-changes guard for Email, Contact form and CSAT (Q-866); confirm the Launcher "Button colour: White / Panel colour" setting

## Phase 21 — Inbox redesign (Sep 2026, speed mode)
- Inbox list: heading + search + new; Needs you / AI handling / Done tabs with quiet counts; Views menu; Sort + filter row; two-line rows; no stats line, pagination or left views rail
- Header: subject + muted name/email/order; assignee avatar, Resolve, Customer toggle, overflow (Snooze, Tags, Priority, Team, Prev/Next, Copy link, Ask AI)
- Thread: 760px column, chat-style messages without boxes, AI tint #FAF7F2 + Why?, note tint #FFF8E6, merged events, compact handoff brief, AI draft as the only card, composer toolbar on focus
- Customer panel 360px (Customer | Ask AI), closed by default and remembered, ] toggles; docked at 1280 and up, overlay at 1024-1279, bottom sheet on phone
- Backlog: older phase check scripts that look for removed Inbox elements (stats line, pagination, stepper, views rail) need updating
