# Goorin Bros. Support Desk: front-end prototype (handoff pack)

This is a clickable, front-end-only prototype of an AI-first support desk for Goorin Bros.:
- Claude answers first, and Grokbot is the second AI tier.
- Humans take over when needed.
- It includes a customer-facing chat widget for the Shopify store and a hosted CSAT survey.

There is **no backend**. Every read and write goes through the async, typed `src/api` layer, which returns mock data after a simulated 300–700 ms latency. To go live, replace the function bodies in `src/api` with HTTP calls. No component or page has to change.

## Contents
1. [Setup, scripts, env vars](#1-setup-scripts-env-vars)
2. [Folder structure](#2-folder-structure)
3. [Routes and access](#3-routes-and-access)
4. [Components](#4-components)
5. [API contract (mock → HTTP)](#5-api-contract-mock--http)
6. [Types](#6-types)
7. [Swapping mocks for real endpoints](#7-swapping-mocks-for-real-endpoints)
8. [Chat widget: Shadow DOM and the future widget.js](#8-chat-widget-shadow-dom-and-the-future-widgetjs)
9. [Demo tools, mock auth, persistence](#9-demo-tools-mock-auth-persistence)
10. [Quality checks (axe, tablet, console, README coverage)](#10-quality-checks)
11. [Brand assets](#11-brand-assets)
12. [Seed facts](#12-seed-facts)

## 1. Setup, scripts, env vars

**Stack:**
- React 19, TypeScript 5.9, Vite 6 and Tailwind CSS 3.
- shadcn/ui-style primitives on Radix (`src/components/ui`).
- lucide-react, Recharts, react-router-dom 7, Tiptap, @dnd-kit, react-day-picker, date-fns, papaparse, react-markdown and sonner.
- Self-hosted Inter Variable (with the opsz axis, so large titles get the Inter Display cut) via @fontsource. There's no serif in the app; the storefront mock uses a Georgia store theme. Title-font alternates (Geist, Manrope, Plus Jakarta Sans) are lazy-loaded for the dev picker only.
- **No Emergent or other platform-specific packages.**

```bash
yarn install
yarn start       # Vite dev server on 0.0.0.0:3000 (alias: yarn dev)
yarn build       # tsc --noEmit + production build to dist/
yarn preview     # serve dist/ on 0.0.0.0:3000
yarn typecheck   # tsc --noEmit
node scripts/check-readme.mjs          # README coverage check (section 10)
node scripts/audit.mjs [baseUrl]       # axe + focus + overflow + console audit (section 10)
```

| env var | purpose |
|---|---|
| `VITE_APP_BASE_URL` | Base URL of the desk, used in the Install script snippet (`$APP_BASE_URL/widget.js`). Example: `https://desk.goorin.com` |
| `VITE_DEMO_TOOLS=true` | Shows the floating "Demo state" switcher in production builds. It always shows in dev. |
| `HMR_CLIENT_PORT` | Optional. The HMR websocket client port when the dev server sits behind a TLS proxy (e.g. `443`). |

## 2. Folder structure

```
frontend/
  index.html, vite.config.ts, tailwind.config.ts, postcss.config.js, tsconfig.json
  public/
    favicon.svg
    images/brand/      official wordmarks, castle mark, AI avatar
    images/products/   generated hat product shots (storefront + order cards)
    images/store/      generated storefront hero/lifestyle imagery
  scripts/
    audit.mjs          axe / focus ring / overflow / console audit (playwright-core + @axe-core/playwright)
    check-readme.mjs   fails if any api function, component file or type is missing from this README
  src/
    main.tsx           React root, fonts, global CSS
    App.tsx            router + providers (auth, tooltips, unsaved guard, demo switcher, toaster)
    index.css          Tailwind layers, global focus-visible fallback
    api/               THE ONLY place that imports mocks. Async, typed, latency + demo-state aware
    mocks/             typed seed data (never imported by components or pages)
    types/index.ts     domain models + API DTOs
    theme/tokens.ts    design tokens consumed by tailwind.config.ts, charts and /styleguide
    components/        reusable components grouped by feature (ui/ = primitives)
    pages/             one component per route
    hooks/useApi.ts    useApi (fetch, reload, refetch on demo-state change), useDemoState
    hooks/useIsPhone.ts useIsPhone (<640px media query), useVisualViewportHeight (keyboard-aware height)
    lib/               pure helpers: format, labels, date ranges, inbox views, widget rules, cn()
```

`src/lib`:
- `format.ts` (`timeAgo`, `formatDuration`, `formatKpiValue`, `isValidEmail`, `initials`)
- `labels.ts` (status, author, resolver, channel and escalation labels)
- `dateRange.ts` (presets, prior period, labels)
- `inboxViews.ts` (`INBOX_VIEWS`, `viewById`, `viewCounts`)
- `widgetRules.ts` (`mergeEffective`, `hiddenReason`, `matchesPattern`, `contrastRatio`, `contrastWarning`, `isHex`, `PAGE_TYPE_LABELS`, `SHARED_FIELDS`)
- `utils.ts` (`cn`)

## 3. Routes and access

| route | access | what it is |
|---|---|---|
| `/login` (`?invite=<token>`) | public | sign in, forgot password, accept invite, expired invite |
| `/` | signed-in | redirects to `/dashboard` |
| `/dashboard` (`?csat=settings` redirects to `/settings/csat`) | signed-in | KPIs (Last 24 hours/7d/30d/90d/Custom), volume, Chat reply timing (last 30 min vs previous 30, independent of the range), refunds, fraud alerts (optional review note), CSAT section |
| `/inbox`, `/inbox/:ticketId` (`?view=all_open\|needs_human\|ai_handling\|mine\|unassigned\|resolved\|closed\|all\|spam\|trash`) | signed-in | VIEWS + SET ASIDE (Spam, Trash with Restore / Delete forever), "+ New" ticket, short ids (`#E3B75B`), 25-per-page pagination, conversation with Assign me / ⋯ / Resolve, AI replied banner, Email timing, delivery status + timeline, Reply / Internal note composer, CUSTOMER & SHOPIFY panel |
| `/guidance` (`?tab=articles\|macros\|import`, `?article=<id>\|new`) | signed-in | Articles / Macros / Import CSV. `?tab=sandbox` redirects to `/ai/testing` |
| `/ai` → `/ai/voice`; `/ai/voice`, `/ai/replies`, `/ai/workflows`, `/ai/testing` | admin | AI & Workflows: Brand voice, AI replies (threshold, auto-send, auto-refunds, Grokbot fallback, prompts), Workflows (escalation rules, business hours, assignment), Conversation testing (multi-turn) |
| `/channels` → `/channels/chat`; `/channels/chat` (`?kind=chat\|form`, `?panel=appearance\|preferences`), `/channels/email`, `/channels/install` | admin | Channels: Chat & form (widget editor + live preview, contact form builder + preview), Email (Office 365 mailbox, sender, signature, auto-ack, Resend domain, test email), Installation |
| `/settings` → `/settings/integrations` | admin | Agents see "You don't have access to Settings" (same for AI & Workflows and Channels) |
| `/settings/account`, `/settings/users`, `/settings/integrations`, `/settings/csat` | admin | Account (profile, password, notifications, sign out everywhere), Users, Integrations tile grid (Configured pill, Connected dot, Manage, amber "Needs attention" edge), CSAT survey settings |
| `/settings/ai`, `/settings/widget`, `/settings/widget#install`, `/settings/integrations/shopify/widget`, `/settings/integrations/shopify/install` | admin | Redirect to `/ai/replies`, `/channels/chat`, `/channels/install`, `/channels/chat`, `/channels/install` |
| `/settings/integrations/:id` (`outlook` (Office 365) \| `shopify` \| `claude` \| `grokbot` \| `resend` \| `loop`) | admin | one integration: header + Test connection, attention/error callout, Connection details / Configuration / Credentials. Shopify links to Channels. An unknown id shows "Integration not found" |
| `/styleguide` | public | living styleguide with a sticky index |
| `/widget-demo` (`?page=product\|collection\|cart`, `?desk_preview=1`) | public | mock Goorin storefront + live widget + demo controls |
| `/widget-demo/theme-editor` | public | mock Shopify theme editor "App embeds" block |
| `/survey/:token` (`?score=1-5`) | public | hosted CSAT survey. `tok_GB1066` and `tok_GB1070` are valid, `done` is already completed, anything else is invalid |
| `*` | any | designed 404 (inside the shell when signed in) |

Signed-in routes are wrapped in `RequireAuth` (it redirects to `/login`). Admin-only routes check `user.role === 'admin'` in the page.

## 3b. Responsive (phones, tablet, desktop)

| width | layout |
|---|---|
| ≥1024 desktop / 640–1023 tablet | unchanged from Phase 6: sidebar (collapsed by default <1024), drawers and centered modals |
| **<640 phone** | **Shell:**<ul><li>The sidebar is replaced by `BottomTabBar` (Dashboard, Inbox + badge, Guidance, Settings admin-only; `bottom-tab-*`).</li><li>The top bar shows the castle mark and page title, then `mobile-search-trigger` (opens a full-screen search), the bell (bottom sheet) and the avatar (bottom sheet with View as + Sign out).</li><li>Toasts, unsaved bars, the bulk bar and the demo switcher (a compact pill) sit above the tab bar.</li></ul>**Primitives:** `DialogContent` / `AlertDialogContent` become bottom sheets (`PHONE_SHEET`, max 92dvh, safe-area padding), and `SheetContent` becomes full-screen.<br>**Touch:**<ul><li>Global CSS gives 44px minimum targets and 16px form text. Switches keep their look and gain hit area through transparent borders.</li><li>Escalation reasons open on tap (Popover).</li><li>Shortcut hints are hidden on `(hover: none)`.</li><li>dnd-kit uses MouseSensor + TouchSensor (250ms delay) + KeyboardSensor, with up/down buttons as well.</li></ul>**Inbox:**<ul><li>Views chip row, filters bottom sheet with Apply/Clear, "Select" mode (`select-mode-toggle`) with a docked bulk bar.</li><li>The conversation is full-screen and hides the tab bar. It has a back button, a `ticket-actions-trigger` sheet (`ticket-actions-sheet`) for status/priority/assignee, and Details as a full-screen `ticket-details-sheet`.</li><li>Draft buttons are full-width, and the composer is docked using a visualViewport-aware height.</li></ul>**Guidance:** articles as cards; editors full-screen via Sheet.<br>**Settings:**<ul><li>Scrollable tab bar; 1-column tiles; stacked sections.</li><li>Users as cards.</li><li>Chat Widget is a single column with a floating `widget-preview-open` button that opens a full-screen preview (`widget-preview-sheet`, device Mobile).</li><li>The theme editor is stacked.</li></ul> |

Checks: `node scripts/phone-sweep.mjs` (overflow / tap targets / font size at 360/390/430, axe + screenshots at 390) and `node scripts/audit.mjs` (desktop + 768/1024 unchanged).

## 4. Components

Each row lists a file in `src/components` (and `src/pages`), its exports and a one-line purpose.

### Shared (`components/`)
| file | exports | purpose |
|---|---|---|
| `components/AuthorBadge.tsx` | `AuthorBadge` | Customer / Claude / Grokbot / Agent / System badge with icon and color |
| `components/PageTabs.tsx` | `PageTabs`, `SubTabs`, `SaveState` | Route-backed segmented page tabs (respect the unsaved guard), underline sub-tabs, "All changes saved / Unsaved changes" indicator |
| `components/NoAccess.tsx` | `NoAccess` | Agent no-access state for Settings, AI & Workflows, Channels |
| `components/ai/BrandVoiceTab.tsx` | `BrandVoiceTab` | Voice on, brand name /100, five style fields /2,000 (examples /4,000) with counters, over-limit errors, sticky "Save brand voice" (enabled only when dirty and valid), rail with "Test this voice" |
| `components/ai/ConversationTesting.tsx` | `ConversationTesting` | Multi-turn customer chat with Claude: per-turn verdict, confidence gauge, order context, articles + scores; channel, order number, examples, Reset; uses the unsaved voice draft from router state |
| `components/channels/ContactFormEditor.tsx` | `ContactFormEditor` | Contact form Appearance (heading, intro, button, success) / Preferences (field builder: show, required, reorder, topic options) + live form preview |
| `components/channels/EmailTab.tsx` | `EmailTab` | Office 365 mailbox status, From name, Reply-to, signature + preview, auto-acknowledgement, Resend domain checks, Send test email |
| `components/dashboard/ChatTimingPanel.tsx` | `ChatTimingPanel` | Chat reply timing, last 30 complete minutes vs the 30 before |
| `components/inbox/NewTicketDialog.tsx` | `NewTicketDialog` | "+ New" ticket composer (email, subject, channel, reply/note, message) |
| `components/inbox/TicketBanners.tsx` | `AiRepliedBanner`, `EmailTiming` | "AI replied" banner while AI sent the latest reply; collapsible received / first AI / first human / SLA timing |
| `components/settings/AccountTab.tsx` | `AccountTab` | Profile, change password (mock current: goorin123), notification switches, sign out of all devices |
| `components/settings/CsatTab.tsx` | `CsatTab` | The CSAT settings drawer content as a full Settings tab with live survey preview |
| `components/ChartCard.tsx` | `ChartCard`, `Legend` | Titled card for a chart, plus a color legend |
| `components/DemoStateSwitcher.tsx` | `DemoStateSwitcher`, `demoToolsEnabled` | Floating Live / Loading / Empty / Error switcher for the mock API |
| `components/KpiCard.tsx` | `KpiCard`, `KpiCardSkeleton` | Single KPI card with delta (styleguide / legacy) |
| `components/Num.tsx` | `Num` | Number display: Inter 600, `tabular-nums lining-nums`, -0.02em tracking (`.num`); unit runs (h, m, min, %, pts, / 5) at 62% size, muted (`.unit`). Used for every KPI / CSAT / %, refund $ and risk score. Titles use `--font-title` (Inter Display). |
| `components/PageHeader.tsx` | `PageHeader` | Inter Display page title (`.title-page`, 600, 28px / 24px phone, -0.025em) + 15px muted subtitle + description + actions row |
| `components/PlaceholderPage.tsx` | `PlaceholderPage` | Designed "coming later" placeholder |
| `components/ScoreChip.tsx` | `ScoreChip` | Colored 1–5 CSAT score chip |
| `components/States.tsx` | `EmptyState`, `ErrorState` | Shared empty and error (with Try again) states |
| `components/StatusPill.tsx` | `StatusPill` | Ticket status pill (6 statuses, needs_human amber) |
| `components/UnsavedGuard.tsx` | `UnsavedGuardProvider`, `useUnsavedGuard` | "Discard unsaved changes?" guard for dirty editors across navigation |
| `components/Wordmark.tsx` | `Wordmark` | Sidebar brand: castle tile (collapsed) or wordmark + "Support Desk" (expanded) |

### Auth, brand (`components/auth`, `components/brand`)
| file | exports | purpose |
|---|---|---|
| `components/auth/AuthContext.tsx` | `AuthProvider`, `useAuth`, `RequireAuth` | Mock session (sessionStorage), role toggle, route guard |
| `components/brand/ShopifyMark.tsx` | `ShopifyMark` | Official Shopify bag mark (`/images/brand/shopify-bag.svg`, Simple Icons CC0, #95BF47, never recolored). Alt "Shopify", or `decorative` next to text. Used on the Shopify tile and detail header (22–24px on a white tile), the inbox "Shopify orders" heading and "View in Shopify" links (14–16px), the Install status card, Theme editor source badges and the theme editor top bar. |
| `components/brand/GoorinBrand.tsx` | `GoorinWordmark`, `GoorinCastle`, `GoorinMonogram` | Official wordmark img (6.2:1, never stretched), castle mark SVG, G monogram |

### Shell (`components/shell`)
| file | exports | purpose |
|---|---|---|
| `components/shell/AppShell.tsx` | `AppShell` | Sidebar + top bar + content layout for signed-in routes |
| `components/shell/Sidebar.tsx` | `Sidebar`, `navItemClass`, `NAV_BADGE_COLLAPSED` | Light collapsible sidebar, needs-human badge, bottom Settings + collapse toggle |
| `components/shell/GlobalSearch.tsx` | `GlobalSearch` | ⌘K / Ctrl+K combobox over tickets, customers, articles |
| `components/shell/NotificationBell.tsx` | `NotificationBell` | Needs-human notifications popover |
| `components/shell/UserMenu.tsx` | `UserMenu` | Account menu: "View as" Admin/Agent, sign out |
| `components/shell/BottomTabBar.tsx` | `BottomTabBar` | Phone (<640px) bottom navigation with Inbox badge and safe-area padding; hidden in an open conversation |
| `components/shell/MobileTopBar.tsx` | `MobileTitle`, `MobileSearch` | Phone top bar: castle mark + page title, and a full-screen search sheet |
| `components/shell/ShellData.tsx` | `ShellDataProvider`, `useShellData` | Single ticket store for the shell (views, badges and bell stay consistent) |

### Dashboard (`components/dashboard`)
| file | exports | purpose |
|---|---|---|
| `components/dashboard/DateRangePicker.tsx` | `DateRangePicker` | Today / 7d / 30d / 90d segmented control + custom calendar range |
| `components/dashboard/KpiStrip.tsx` | `KpiStrip`, `DeltaText`, `KPI_KEYS` | Phase 12: 5 KPIs (Open tickets "Current snapshot" with no delta or sparkline; AI resolution rate, First response time, Resolution time, CSAT average). Deltas are plain coloured text + arrow + muted "vs prior <period>" (no pills); time KPIs are good when down. Phone: 2 columns, the 5th spans both |
| `components/dashboard/OverviewCharts.tsx` | `VolumeChart`, `AiPerformanceCard` | Ticket volume (240px chart, "Tickets created <n>" + delta in header, Email/Chat legend), "Resolved by" ("<x>% resolved by AI" + Claude/Grokbot/Human counts and %), "Why tickets reach a person" (tabs Escalation reasons / Top topics, empty "No data for this period") |
| `components/dashboard/Panel.tsx` | `Panel`, `PillTabs`, `ViewAll`, `RankedList` | Dashboard surface with loading/empty/error (Try again); pill tabs; "View all (n)" button hidden at ≤3 items; ranked bar list |
| `components/dashboard/CsatCharts.tsx` | `CsatCard` | Phase 12 single "Customer satisfaction" card: average, response rate, trend, 1–5 distribution, one inline row of channel + resolver averages, "CSAT settings" link (admin), tabs Latest comments / Needs follow-up (≤2), 5 items each, empty "No low scores in this period." |
| `components/dashboard/RefundsFraudCard.tsx` | `RefundsFraudCard` | Revision 2 "Refunds & fraud" card: tabs Refunds / Fraud alerts (n open), both kept mounted; fraud rows are compact with a ⋯ menu (note dialog + undo kept) |
| `components/dashboard/RefundsPanel.tsx` | `RefundsPanel` | "Refunds": headline numbers, "Auto-refund limit: $<n>" link (→ /ai/replies), trend, pipeline, top 3 Awaiting approval + "View all" side sheet (`refunds-view-all`, `refunds-sheet`) |
| `components/dashboard/FraudPanel.tsx` | `FraudPanel` | "Fraud alerts" (`#fraud`): top 3 open alerts by score (`fraud-top-open`) with actions; "View all" (`fraud-view-all`) opens `fraud-sheet` with Open / Reviewed tabs (`fraud-tab-*`, `fraud-list-*`), actions, notes and an inline Undo (`fraud-sheet-undo`, toasts can't be clicked under a modal sheet) |
| `components/dashboard/FraudBits.tsx` | `RiskBadge`, `FraudShield`, `SignalChips`, `RefundPipeline`, `FraudAlertRow`, `RISK_LABEL` | Risk badge (score + High/Medium/Low text), inbox shield icon, signal chips, Requested → Approved → Refunded pipeline bar, fraud alert row |
| `components/dashboard/chartTheme.tsx` | `Responsive`, `ChartFigure`, `axisProps`, `gridProps`, `tooltipProps` | Shared Recharts wrappers and styling |

### CSAT settings (`components/csat`)
| file | exports | purpose |
|---|---|---|
| `components/csat/CsatSettingsDrawer.tsx` | `CsatSettingsDrawer` | Sheet for survey questions, send delay, channels, recipients |
| `components/csat/QuestionList.tsx` | `QuestionList` | Sortable list of survey questions |
| `components/csat/QuestionItem.tsx` | `QuestionItem`, `QuestionErrors`, `TYPE_LABELS` | One editable question (type, text, required, options) |
| `components/csat/RecipientsInput.tsx` | `RecipientsInput` | Email chip input for low-score alert recipients |
| `components/csat/SurveyPreview.tsx` | `SurveyPreview` | Live preview of the email/hosted survey |

### Inbox (`components/inbox`)
| file | exports | purpose |
|---|---|---|
| `components/inbox/FraudBanner.tsx` | `FraudBanner` | Red conversation banner "Fraud risk <score> · <level>" + signal chips + "View alert" → `/dashboard#fraud` (only while the ticket has an open alert) |
| `components/inbox/ViewsNav.tsx` | `ViewsNav`, `ViewsDropdown`, `ViewsChips` | Inbox views with counts (sidebar list, dropdown on tablet, chip row on phones) |
| `components/inbox/TicketFilters.tsx` | `TicketFilters`, `Filters`, `matchFilters`, `activeFilterCount` | Channel / priority / assignee / tag filters |
| `components/inbox/TicketList.tsx` | `TicketList` | Ticket list: row 2 is the AI status line + icon-only Sort/Filter (`list-subheader`); when anything is selected the bulk bar (with Select all) replaces it. Loading/empty/error |
| `components/inbox/TicketRow.tsx` | `TicketRow` | One ticket card. The channel icon swaps to the checkbox on hover/focus or while a selection exists (REQ-713) |
| `components/inbox/BulkBar.tsx` | `BulkBar` | Bulk bar (Select all, count, Assign / Tag / Close, clear) |
| `components/inbox/ConversationPane.tsx` | `ConversationPane`, `ConversationHandle` | Two-row 56px header (subject + Resolve/⋯/‹ ›; then customer · channel · #id · status · assignee/Assign me · SLA chip), thread opening at the Why brief, draft, composer, Summary/Details panel with collapse rail (`]`) |
| `components/inbox/TicketBanners.tsx` | `AiRepliedBanner`, `SlaChip` | "AI replied" banner (hidden when a person is needed); SLA chip whose popover holds the email/chat timing (`email-timing-toggle`, `email-timing`) |
| `components/inbox/SummaryPanel.tsx` | `SummaryPanel`, `SummaryRail` | 56px header; four rows (Customer incl. "<n> past ticket(s)", Latest order, Returns, Risk) and "View full details", which replaces the rows with the full sections ("Show summary" in the header goes back); 44px rail with indicators when collapsed |
| `components/inbox/WhyBrief.tsx` | `WhyBrief`, `SOURCE_ICON` | "Why you're here" brief: white card, 3px amber left accent, reason, What the AI did, Suggested next step, How the AI got here |
| `components/inbox/MessageItem.tsx` | `MessageItem`, `richText`, `stamp` | One message card (≤85%/760px, customer left, AI/agent right, delivery tick + copy in header, AI footer), internal note (light amber), centered event line |
| `components/inbox/DraftCard.tsx` | `DraftCard` | AI draft: "Draft by Claude · <n>% confidence · <article>", 4-line preview with fade + "Show full draft", one action row (Approve & send split, Edit, Discard, Write my own) |
| `components/inbox/EscalationChip.tsx` | `EscalationChip`, `escalationPath` | Claude → Grokbot → Human timeline chip with reasons |
| `components/inbox/Composer.tsx` | `Composer`, `ComposerHandle`, `ComposerMode` | Tiptap reply / internal-note composer with formatting and macros |
| `components/inbox/MacroPicker.tsx` | `MacroPicker`, `macroToHtml` | Searchable macro insert popover |
| `components/inbox/DetailParts.tsx` | `CountBadge`, `Section`, `KV`, `LABEL_COL`, `TagChips`, `Identity`, `StatsGrid`, `initials` | Shared Details/Summary building blocks: count bubbles, accordion sections, label column, identity header, 2×2 stats |
| `components/inbox/DetailsSidebar.tsx` | `DetailsSidebar` | Customer & Shopify panel: customer header, stats, orders (newest first, latest expanded), past tickets, AI attempt log. At ≥1024px it's the always-visible right panel (`customer-panel`, open by default, `customer-panel-collapse` with aria-expanded, rail when collapsed, kept in sessionStorage `goorin.customerPanel`). Below 1024px and on phones it's the Details sheet. |
| `components/inbox/LoopReturns.tsx` | `LoopReturnsSection`, `LoopReturnCard`, `LoopMark`, `loopStats` | "Loop Returns" section below Shopify orders (`loop-returns-section`). Loop wordmark header (`/images/brand/loop-wordmark.svg`, official, #0472FF ring). Stats (`loop-stats`): Returns count, Returned $ and Return rate % of lifetime spend; cancelled/expired returns are counted but left out of the $ and %. Amber "High return rate" chip over 30%. Return cards (`loop-return-<id>`) show state + outcome pills, items with reason, totals, label status and `loop-view-<id>` (MOCKED admin.loopreturns.com, new tab, with the Loop mark `/images/brand/loop-mark.svg`). Empty state `loop-empty` "No returns with Loop". The collapsed rail shows the Loop mark + count. |
| `components/inbox/CustomerPanel.tsx` | `CustomerHeader`, `CustomerStats`, `OrderCard`, `CustomerRail`, `useCustomerPanel`, `initials`, `newestFirst` | Initials avatar, email, phone, location, "Customer since Mon YYYY", Shopify tag chips (`customer-tags`), View in Shopify, red "Fraud risk <level>" chip, guest state. Stats row (`customer-stats`: Orders, Lifetime spend, Avg order value, Last order). Order card (`order-card-<id>`: payment + fulfillment pills, total, line items with thumbnails, ship-to, tracking link and `order-view-shopify-<id>`, which opens a MOCKED admin.shopify.com URL in a new tab). |
| `components/inbox/ShortcutHelp.tsx` | `ShortcutHelp` | Keyboard shortcut help dialog |

### Guidance (`components/guidance`)
| file | exports | purpose |
|---|---|---|
| `components/guidance/ArticlesTab.tsx` | `ArticlesTab` | Article list, search, active toggle, import/export |
| `components/guidance/ArticleEditor.tsx` | `ArticleEditor`, `markdownStyles` | Markdown article editor with preview (Write/Preview tabs below 1024px) |
| `components/guidance/CsvImportDialog.tsx` | `CsvImportDialog`, `downloadCsv` | CSV import with column mapping (papaparse), CSV export helper |
| `components/guidance/MacrosTab.tsx` | `MacrosTab` | Macro list + editor (duplicate-name validation) |
| `components/guidance/SandboxTab.tsx` | `SandboxTab` | Test a question against guidance: ranked articles, draft, confidence, escalation |

### Settings (`components/settings`)
| file | exports | purpose |
|---|---|---|
| `components/settings/IntegrationsTab.tsx` | `IntegrationsTab`, `IntegrationTile`, `StatusPill`, `LogoTile`, `Result`, `Credentials`, `STATUS`, `META`, `lastSync` | Health summary + 3/2/1-column tile grid; each tile links to its detail page |
| `components/settings/IntegrationDetail.tsx` | `IntegrationDetail` | Detail page: header with Test connection, error callout, Connection details, Configuration (model + test prompt, Resend test email), Credentials, unsaved bar |
| `components/settings/AiTab.tsx` | `AiTab` | Threshold band slider, auto-send matrix, business hours, sentence rules, Auto-refunds (toggle + $0–500 limit, default $75), prompt viewer |
| `components/settings/UsersTab.tsx` | `UsersTab` | Team header + search, user rows, invite dialog, row actions, deactivate confirm |
| `components/settings/SaveBar.tsx` | `SaveBar`, `FormSection` | Shared sticky unsaved-changes bar, and the label-left/control-right form section |

### Chat widget settings (`components/widgetSettings`)
| file | exports | purpose |
|---|---|---|
| `components/widgetSettings/WidgetSettingsTab.tsx` | `WidgetSettingsTab` | `view='editor'` (Channels → Chat: sections + sticky live preview) or `view='install'` (Shopify → Install). Draft state, validation, save bar, route guard |
| `components/widgetSettings/BrandingSection.tsx` | `BrandingSection` | 7 colors, logo/avatars, font, radius, shadow |
| `components/widgetSettings/LauncherSection.tsx` | `LauncherSection` | Icon, style, label, size, position, offsets, badge, animation |
| `components/widgetSettings/HomeSection.tsx` | `HomeSection`, `ConversationSection`, `StartersEditor`, `starterError`, `MAX_STARTERS` | Home screen (top buttons, starters editor: drag or ↑↓, ≤40 chars, max 8, Ask AI / Start a workflow / Open a link) and Conversation toggles |
| `components/widgetSettings/MessagingSection.tsx` | `MessagingSection`, `PageTypePicker`, `ToggleRow`, `PAGE_TYPES` | Header, greeting, proactive bubble, pre-chat, handoff, offline |
| `components/widgetSettings/QuickReplies.tsx` | `QuickReplies` | Quick replies with drag, keyboard and up/down reorder (max 7) |
| `components/widgetSettings/DisplaySection.tsx` | `DisplaySection`, `CsatInChatSection` | Display rules (page types, URL include/exclude, mobile, outside hours, context) and CSAT style |
| `components/widgetSettings/InstallSection.tsx` | `InstallSection`, `APP_BASE_URL` | Shopify install status, App embed steps, script snippet, verify |
| `components/widgetSettings/WidgetPreview.tsx` | `WidgetPreview`, `DeviceStage`, `PreviewOptions`, `PreviewPage`, `Device` | Channels preview: Outside business hours toggle in the header, Desktop/Phone + Home/Conversation/Order tracking controls, and the real widget on a plain surface (no storefront). The panel is always open in the chosen view and scales down to fit. `DeviceStage` (storefront frames) is used only by the theme-editor sim |
| `components/widgetSettings/MiniStore.tsx` | `MiniStore`, `PREVIEW_PATHS`, `STORE_FONT` | Compact serif storefront used by the theme-editor sim (`DeviceStage`) |
| `components/widgetSettings/fields.tsx` | `Section`, `FieldLabel`, `FieldError`, `ColorField`, `UploadField`, `Segmented`, `RangeField`, `TextField`, `SourceBadge`, `Switch`, `PRESETS` | Form building blocks (collapsible section with summary, color + contrast warning, uploads) |
| `components/widgetSettings/summaries.ts` | `sectionSummary` | One-line value summary for each collapsed section header |
| `components/widgetSettings/validate.ts` | `validateWidget`, `sanitizeForPreview`, `WidgetErrors`, `Update`, `COLOR_KEYS` | Widget settings validation and preview sanitizing |

### Customer chat widget (`components/widget`)
| file | exports | purpose |
|---|---|---|
| `components/widget/SupportWidget.tsx` | `SupportWidget`, `SupportWidgetProps` | The single settings-driven widget (live or contained, forced states) |
| `components/widget/ShadowRoot.tsx` | `ShadowRoot` | Attaches an open shadow root and injects `widget.css` |
| `components/widget/WidgetErrorBoundary.tsx` | (default class) `WidgetErrorBoundary` | Keeps a widget crash from blanking the host page |
| `components/widget/Launcher.tsx` | `Launcher`, `GreetingBubble`, `launcherSize` | Circle/pill launcher with unread badge, proactive greeting bubble |
| `components/widget/PanelHeader.tsx` | `PanelHeader` | Panel header: logo, title, subtitle, AI disclosure, minimize |
| `components/widget/ChatView.tsx` | `MessageList`, `OrderCard`, `Composer`, `ChatMsg` | Bubbles, quick replies, typing indicator, handoff, order card, chat composer |
| `components/widget/Forms.tsx` | `PreChatForm`, `OfflineView`, `Identity` | Pre-chat form and offline message form |
| `components/widget/CsatView.tsx` | `CsatView`, `TranscriptSent` | Inline CSAT (stars/emoji/numeric) and transcript confirmation |
| `components/widget/icons.tsx` | `HatIcon`, `LauncherGlyph` | Launcher icon set |
| `components/widget/widget.css` | — | Plain px-based CSS injected inside the shadow root |

### Storefront demo (`components/storefront`)
| file | exports | purpose |
|---|---|---|
| `components/storefront/StoreChrome.tsx` | `StoreHeader`, `StoreFooter` | Mock Goorin store header/footer |
| `components/storefront/StorePages.tsx` | `ProductPage`, `CollectionPage`, `CartPage` | Mock product, collection and cart pages |
| `components/storefront/DemoControls.tsx` | `DemoControls`, `WIDGET_STATES` | Demo panel: page, login, outside hours, hostile CSS, jump to widget state |
| `components/storefront/hostileCss.ts` | `HOSTILE_CSS` | Deliberately aggressive store CSS that proves widget isolation |
| `components/storefront/storeTypes.ts` | `StorePage`, `STORE_PAGES` | Storefront page ids and paths |

### Styleguide (`components/styleguide`)
| file | exports | purpose |
|---|---|---|
| `components/styleguide/SgSection.tsx` | `SgSection`, `Specimen`, `SgIndex`, `SG_INDEX` | Styleguide section wrapper, specimen caption, sticky in-page index |
| `components/styleguide/InboxSamples.tsx` | `InboxSamples` | Draft card variants, escalation chip, internal note, composer |
| `components/styleguide/WidgetSamples.tsx` | `WidgetSamples` | All widget components through the real SupportWidget (Shadow DOM, contained) |
| `components/styleguide/AppPatterns.tsx` | `DashboardSamples`, `NavSamples`, `SegmentedSample`, `SettingsSamples`, `PhoneSamples` | KPI strip, stacked + ranked bars, nav item states, segmented control, integration tiles, form section, phone tab bar + bottom sheet |

### UI primitives (`components/ui`)
| file | exports | purpose |
|---|---|---|
| `components/ui/button.tsx` | `Button`, `buttonVariants`, `ButtonProps`, `focusRing` | Button variants/sizes with loading state; shared focus ring class |
| `components/ui/input.tsx` | `Input`, `Textarea`, `Label`, `FieldError` | Form fields with focus ring and invalid styling |
| `components/ui/select.tsx` | `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` | Radix select |
| `components/ui/card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` | Card surface |
| `components/ui/dialog.tsx` | `Dialog`, `DialogContent`, `DialogTitle`, `DialogDescription`, `PHONE_SHEET`, `SheetGrabber` | Modal dialog; becomes a bottom sheet below 640px (`PHONE_SHEET`, also used by AlertDialog) |
| `components/ui/alert-dialog.tsx` | `AlertDialog`, `AlertDialogContent`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogCancel`, `AlertDialogAction` | Confirm dialog |
| `components/ui/sheet.tsx` | `Sheet`, `SheetTrigger`, `SheetClose`, `SheetContent`, `SheetTitle`, `SheetDescription`, `SheetCloseButton` | Side drawer |
| `components/ui/dropdown-menu.tsx` | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem` | Menus |
| `components/ui/overlay.tsx` | `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverClose`, `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`, `Switch` | Popover, tooltip, switch |
| `components/ui/skeleton.tsx` | `Skeleton`, `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` | Skeleton block and table primitives |
| `components/ui/calendar.tsx` | `Calendar` | react-day-picker range calendar |
| `components/ui/sonner.tsx` | `Toaster` | Toasts |

### Pages (`src/pages`)
| file | route | purpose |
|---|---|---|
| `pages/LoginPage.tsx` | `/login` | Sign in, forgot password, invite accept/expired |
| `pages/DashboardPage.tsx` | `/dashboard` | Range control, KPI strip, overview, CSAT |
| `pages/InboxPage.tsx` | `/inbox/:ticketId?` | Three-pane inbox |
| `pages/GuidancePage.tsx` | `/guidance` | Articles / Macros / Import CSV tabs, "+ New article", link to AI & Workflows |
| `pages/SettingsPage.tsx` | `/settings/:tab` | Account / Users / Integrations / CSAT, old-route redirects, no-access state |
| `pages/AiPage.tsx` | `/ai/:tab` | AI & Workflows: Brand voice / AI replies / Workflows / Conversation testing |
| `pages/ChannelsPage.tsx` | `/channels/:tab` | Channels: Chat & form / Email / Installation (+ contact form app-block card) |
| `pages/StyleguidePage.tsx` | `/styleguide` | Living styleguide |
| `pages/WidgetDemoPage.tsx` | `/widget-demo` | Storefront + live widget + demo controls |
| `pages/ThemeEditorPage.tsx` | `/widget-demo/theme-editor` | Shopify theme editor mock |
| `pages/SurveyPage.tsx` | `/survey/:token` | Hosted CSAT survey |
| `pages/NotFoundPage.tsx` | `*` | 404 |

## 5. API contract (mock → HTTP)

Import from `@/api` (`src/api/index.ts`), which exports one namespace per domain. Every function returns `Promise<T>`, except the two client-only preview helpers.

**Error shape (all functions):** a rejected promise carries an `ApiError { name: 'ApiError', message: string, status: number }`. The message is user-facing copy that the UI shows verbatim.
- Every call can fail with `500 "We couldn't reach the Goorin desk just now."` (the Error demo state, or the network).
- The column "errors" lists the additional, function-specific failures.
- A real backend should return `{ "message": string }` with the HTTP status, so the client can rebuild `ApiError`.

`actor` / `actorId` is the signed-in user, passed explicitly by the prototype. A real backend should take it from the auth token instead.

### auth (`authApi`, `api/auth.ts`)
| function | method + path | request | response | errors |
|---|---|---|---|---|
| `authApi.signIn(email, password)` | `POST /api/auth/login` | `{ email, password }` | `SessionUser` | 401 "Incorrect email or password." |
| `authApi.requestPasswordReset(email)` | `POST /api/auth/password-reset` | `{ email }` | `{ email }` | — |
| `authApi.getInvite(token)` | `GET /api/invites/:token` | — | `Invite \| null` (`expired: true` for expired) | — |
| `authApi.acceptInvite(token, name, password)` | `POST /api/invites/:token/accept` | `{ name, password }` | `SessionUser` | 410 "This invite has expired", 422 "Use at least 8 characters." |

### tickets (`ticketsApi`, `api/tickets.ts`)
| function | method + path | request | response | errors |
|---|---|---|---|---|
| `ticketsApi.listTickets({ status? })` | `GET /api/tickets?status=` | query `{ status?: TicketStatus }` | `Ticket[]` (newest update first) | — |
| `ticketsApi.listNeedsHuman()` | `GET /api/tickets?status=needs_human` | — | `Ticket[]` (bell + Inbox badge) | — |
| `ticketsApi.getTicket(id)` | `GET /api/tickets/:id` | — | `Ticket \| null` | — |
| `ticketsApi.listMessages(id)` | `GET /api/tickets/:id/messages` | — | `Message[]` | — |
| `ticketsApi.listAiAttempts(id)` | `GET /api/tickets/:id/ai-attempts` | — | `AIAttempt[]` | — |
| `ticketsApi.getAiDraft(id)` | `GET /api/tickets/:id/ai-draft` | — | `AIDraft \| null` | — |
| `ticketsApi.getCustomer(id)` | `GET /api/customers/:id` | — | `Customer \| null` (with Shopify orders) | — |

### messages / drafts (`inboxApi`, `api/inbox.ts`)
| function | method + path | request | response | errors |
|---|---|---|---|---|
| `inboxApi.getTicketDetail(id)` | `GET /api/tickets/:id/detail` | — | `TicketDetail \| null` `{ ticket, messages, drafts, attempts, customer, pastTickets, guidanceTitles }` | — |
| `inboxApi.setAside(id, where, actor)` | `POST /api/tickets/:id/set-aside` | `{ where: 'spam' \| 'trash' \| null }` (null = Restore) | `Ticket` with `setAside`; set-aside tickets leave every VIEW and appear only in Spam / Trash | 404 |
| `inboxApi.deleteForever(id)` | `DELETE /api/tickets/:id` | — | `{ id }` (ticket + messages removed) | 409 "Move the ticket to Trash first." |
| `inboxApi.createTicket(input, actor)` | `POST /api/tickets` | `NewTicketInput` `{ email, name?, subject, channel, body, isInternal }` | `Ticket` (next id, e.g. `GB-1084`, status open, assigned to the actor) | 422 "Enter a valid email address.", "Add a subject." |
| `inboxApi.updateTicket(id, patch, actor)` | `PATCH /api/tickets/:id` | `TicketPatch { status?, priority?, assignee?, team?, snoozedUntil?, tags? }` | `TicketDetail` (adds System messages) | 404 |
| `inboxApi.TEAMS` | constant | — | `Record<TeamId, string>` Support / Returns / Wholesale (Phase 10) | — |
| `inboxApi.bulkUpdate(ids, patch, actor)` | `POST /api/tickets/bulk` | `{ ids: string[], patch: BulkPatch }` | `Ticket[]` | — |
| `inboxApi.sendMessage(id, msg, actor)` | `POST /api/tickets/:id/messages` | `NewMessage { html, isInternal, draftId? }` | `TicketDetail` (removes the draft when `draftId` is sent) | 404 |
| `inboxApi.approveDraft(id, draftId, actor)` | `POST /api/tickets/:id/drafts/:draftId/approve` | — | `TicketDetail` (AI message with `approvedBy`) | 404 |
| `inboxApi.discardDraft(id, draftId)` | `DELETE /api/tickets/:id/drafts/:draftId` | — | `TicketDetail` | 404 |
| `inboxApi.restoreDraft(draft)` | `POST /api/tickets/:id/drafts` | `AIDraft` | `TicketDetail` (Undo after discard) | 404 |

### Saved views + Shopify order actions (`viewsApi`, `api/views.ts`), Phase 10, MOCKED
| function | method + path | request | response | errors |
|---|---|---|---|---|
| `viewsApi.listSavedViews(user)` | `GET /api/views` | — | `SavedView[]` (all shared + the caller's private) | — |
| `viewsApi.saveView(input, user)` | `POST /api/views` (or `PATCH /api/views/:id` with `id`) | `{ id?, name, scope: 'shared' \| 'private', filters: SavedViewFilters }` | `SavedView` | 422 empty / >40 chars, 409 duplicate name, 403 shared view not yours |
| `viewsApi.deleteView(id, user)` | `DELETE /api/views/:id` | — | `{ id }` | 404, 403 "Only the creator or an admin can delete this view." |
| `viewsApi.canManageView(view, user)` | helper | — | `boolean` (creator or admin) | — |
| `viewsApi.matchSavedView(ticket, view)` | helper (server-side filter) | — | `boolean` | — |
| `viewsApi.refundOrder(input, ticketId, actor)` | `POST /api/shopify/orders/:id/refund` | `OrderRefundInput { orderId, items: Record<sku, qty>, shipping, restock, reason, note, notify }` | `ShopifyOrder` with `refundedAmount`, `financialStatus` partially_refunded / refunded; adds a System message | 404, 422 "Enter an amount between $0 and $X." |
| `viewsApi.refundAmount(order, { items, shipping })` / `viewsApi.refundable(order)` | helpers | — | `number` | — |
| `viewsApi.autoRefundLimit()` | reads AI settings | — | `number` ($75 seed) | — |
| `viewsApi.createDraftOrder(label)` | `POST /api/shopify/draft-orders` | `{ label: 'edit' \| 'duplicate' \| 'create' }` | `{ number: '#D####', label }` (Edit / Duplicate / Create order all end in a confirmation) | — |
| `viewsApi.TICKET_FIELDS` / `viewsApi.TAG_COLORS` | constants | — | ticket field options, tag dot colours (one Shopify store, goorin-bros, so there is no store selector: REQ-685) | — |

### Ask Goorin AI + handover (`assistantApi`, `api/assistant.ts`), Phase 10, MOCKED
| function | method + path | request | response | errors |
|---|---|---|---|---|
| `assistantApi.ask(question, detail)` | `POST /api/assistant/ask` | `{ question, ticketId? }` | `{ text, draft? }`, built only from that ticket's seed data (summary, orders, refund eligibility vs the auto-refund limit and fraud alert, draft reply) or desk-wide counts | — |
| `assistantApi.handoverFor(detail)` | part of `GET /api/tickets/:id/detail` | — | `Handover \| null` `{ summary (null when <3 messages), intent, conclusion, bullets[{ text, source: 'doc' \| 'shopify' }], at, stale }` | — |
| `assistantApi.intentOf(tags)` | helper | — | "Damaged item / Replacement" etc. | — |
| `assistantApi.PROMPTS_TICKET` / `assistantApi.PROMPTS_GLOBAL` | constants | — | suggested prompts | — |

### dashboard (`dashboardApi`, `api/dashboard.ts`)
| function | method + path | request | response | errors |
|---|---|---|---|---|
| `dashboardApi.getDashboardSummary(range)` | `GET /api/dashboard/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` | query `DateRange` | `DashboardSummary` (KPIs with prior-period values + series, charts, `CsatSummary`) | — |
| `dashboardApi.getChatReplyTiming()` | `GET /api/dashboard/chat-timing` | — | `ChatReplyTiming` (`windowLabel`, `current` / `previous` `ChatTimingWindow`: median first reply, median reply, waiting now, longest wait, seconds). Seed: 14s/38s/2/192s vs 21s/44s/3/165s | — |

### AI & Workflows (`aiApi`, `api/ai.ts`), MOCKED
| function | method + path | request | response | errors |
|---|---|---|---|---|
| `aiApi.getBrandVoice()` | `GET /api/ai/brand-voice` | — | `BrandVoice` | — |
| `aiApi.saveBrandVoice(v)` | `PUT /api/ai/brand-voice` | `BrandVoice` (limits in `BRAND_VOICE_LIMITS`: brand name 100, tone / how to respond / phrases 2,000, examples 4,000) | `BrandVoice` with new `updatedAt` | 422 "Keep this under N characters." |
| `aiApi.testConversation(input)` | `POST /api/ai/test-conversation` | `ConversationTestInput` (`history: TestTurn[]`, `message`, `channel`, `orderNumber?`, `voice?` unsaved draft) | `TestTurn` (`role: 'ai'`, text, `result: SandboxResult`) | — |
| `aiApi.styleWithVoice(draft, voice, channel)` | (client helper) | — | string: opener phrase, avoided phrases removed, chat ≤ 3 sentences, email signed | — |

### Workflows / process automations (`workflowsApi`, `api/workflows.ts`), Phase 13, MOCKED (resets on reload)
| function | method + path | request | response | errors |
|---|---|---|---|---|
| `workflowsApi.listWorkflows()` | `GET /api/workflows` | — | `Workflow[]` in run-priority order | — |
| `workflowsApi.getWorkflow(id)` | `GET /api/workflows/:id` | — | `Workflow \| null` | — |
| `workflowsApi.listTemplates()` | `GET /api/workflow-templates` | — | `{ id, name, description, steps }[]` | — |
| `workflowsApi.createWorkflow(by, templateId?)` | `POST /api/workflows` | `{ templateId? }` | `Workflow` (status `draft`) | — |
| `workflowsApi.saveWorkflow(wf, by)` | `PUT /api/workflows/:id` | `Workflow` | `Workflow` | 422 an active workflow with issues |
| `workflowsApi.setStatus(id, status, by)` | `POST /api/workflows/:id/status` | `{ status }` | `Workflow` | 422 "Fix N issues before turning this on." |
| `workflowsApi.duplicateWorkflow(id, by)` | `POST /api/workflows/:id/duplicate` | — | `Workflow` (Draft copy) | — |
| `workflowsApi.renameWorkflow(id, name, by)` | `PATCH /api/workflows/:id` | `{ name }` | `Workflow` | — |
| `workflowsApi.deleteWorkflow(id)` | `DELETE /api/workflows/:id` | — | `true` | — |
| `workflowsApi.reorderWorkflows(ids)` | `PUT /api/workflows/order` | `string[]` | `Workflow[]` | — |
| `workflowsApi.findOrdersByEmail(email)` | `GET /api/shopify/orders?email=` | — | `RunOrder[]` (same seed as the Inbox panel) | — |
| `workflowsApi.activeOrderTracking()` | (runtime helper) | — | the Active chat "Order status" workflow or null | — |
| `workflowsApi.ORDER_INTENT_RE` | (runtime helper) | — | RegExp for order-status questions in the widget | — |
| `workflowsApi.activeWorkflowFor(text)` | (runtime helper) | — | the first Active chat workflow whose trigger matches the text, or null | — |
| `workflowsApi.activeWorkflowById(id)` | (runtime helper) | — | that workflow if it's Active, else null (widget starters fall back to the AI) | — |
| `workflowsApi.starterWorkflowChoices()` | `GET /api/workflows?trigger=chat` | — | `{ id, name, active }[]` for the starter "Start a workflow" picker | — |

**Model** (`types/workflows.ts`): `Workflow { trigger: Trigger, steps: Step[], edges: Edge[] }`. List and Canvas are two views of this one graph. `Edge { source, sourceHandle, target }`; the trigger node id is `trigger`. **Step types**: message, ask (text / email / number / buttons, each button is a path), send_code, check_code (paths `ok` / `fail`), find_orders, show_orders, update_address, find_returns, start_return (Loop), condition (paths `yes` / `no`), add_tag, set_field, handover, end. **Variables**: ask sets its `variable`; send_code sets `code`; find_orders sets `orders`, `orders.count`, `orders.unfulfilled`, `order.number`, `order.tracking_url`; start_return sets `rma`; built in: `channel`, `customer.name`, `tries_left`. `lib/workflowGraph.ts` holds validation (`validate`), insert/remove/duplicate/swap and the dagre "Tidy up"; `lib/workflowRuntime.ts` (`startRun`, `replyRun` → `TestRun`) runs Test workflow and the widget. It never shows order details on chat before the code is verified.

### Channels (`channelsApi`, `api/channels.ts`), MOCKED
| function | method + path | request | response | errors |
|---|---|---|---|---|
| `channelsApi.getContactForm()` | `GET /api/channels/contact-form` | — | `ContactFormSettings` (`fields: ContactField[]`, `ContactFieldType`) | — |
| `channelsApi.saveContactForm(s)` | `PUT /api/channels/contact-form` | `ContactFormSettings` | same | 422 "Add a button label.", "Add at least one topic." |
| `channelsApi.getEmailChannel()` | `GET /api/channels/email` | — | `EmailChannelSettings` | — |
| `channelsApi.saveEmailChannel(s)` | `PUT /api/channels/email` | `EmailChannelSettings` | same | 422 "Add a from name.", "Enter a valid email address." |

### Account (`accountApi`, `api/account.ts`), MOCKED
| function | method + path | request | response | errors |
|---|---|---|---|---|
| `accountApi.getNotificationPrefs(userId)` / `accountApi.saveNotificationPrefs(userId, prefs)` | `GET` / `PUT /api/account/notifications` | `NotificationPrefs` | `NotificationPrefs` | — |
| `accountApi.changePassword(input)` | `POST /api/account/password` | `ChangePasswordInput` (mock current password `goorin123`) | `{ ok: true }` | 403 "Your current password is incorrect.", 422 |
| `accountApi.signOutAllDevices()` | `POST /api/account/sign-out-all` | — | `{ sessions: 3 }` | — |

### Customer & Shopify tools (`customerToolsApi`, `api/customerTools.ts`), MOCKED
| function | method + path | request | response | errors |
|---|---|---|---|---|
| `customerToolsApi.findOrder(query)` | `GET /api/shopify/orders/search?q=` | order # or customer email | `{ order, customerName, email } \| null` | — |
| `customerToolsApi.checkInventory(sku)` | `GET /api/shopify/inventory?sku=` | SKU | `InventoryResult` (S/M/L/XL available + incoming, deterministic per SKU) | 422 "Enter a SKU.", 404 "No product with SKU X." |
| `customerToolsApi.lookupOrderDetails(number)` | `GET /api/shopify/orders/:number` | — | `ShopifyOrder` | 404 "Order not found." |
| `customerToolsApi.getCustomerCsat(customerId)` | `GET /api/customers/:id/csat` | — | `CsatResponse[]` newest first | — |

### Loop Returns (`loopApi`, `api/loop.ts`), MOCKED (Loop is a Shopify returns app)
| function | method + path | request | response | errors |
|---|---|---|---|---|
| `loopApi.getCustomerReturns(customerId)` | `GET /api/customers/:id/loop-returns` | — | `LoopReturn[]` newest first | — |

### refunds + fraud alerts (`refundsApi`, `api/refunds.ts`), Phase 8, MOCKED (no real Shopify refunds or fraud engine)
| function | method + path | request | response | errors |
|---|---|---|---|---|
| `refundsApi.getRefunds(range)` | `GET /api/refunds/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` | query `DateRange` | `RefundSummary` (totals, prior-period total, auto %, pending, stage counts, trend, awaiting list, current `AutoRefundSettings`) | — |
| `refundsApi.getFraudAlerts()` | `GET /api/fraud-alerts` | — | `FraudAlert[]` newest first | — |
| `refundsApi.reviewFraudAlert(id, action, actor, note?)` | `POST /api/fraud-alerts/:id/review` | `{ action: FraudAction, note?: string }` (actor from the session; note stored as `reviewNote`, shown on the Reviewed tab and the inbox banner) | `FraudReviewResult` (`held` also sets the linked requested/approved refund to `on_hold`) | 404 "Alert not found.", 409 "This alert was already reviewed." |
| `refundsApi.undoFraudReview(id)` | `POST /api/fraud-alerts/:id/undo` | — | `FraudAlert` back to `open` (a held refund returns to its earlier stage) | 404 |

Tickets carry `fraud: TicketFraudFlag \| null` and `TicketDetail.fraudAlert` is the open alert. Both are derived by the server, and the bell and Inbox badge still count needs_human only. `PUT /api/settings/ai` also validates `autoRefund.limit` (422 "Enter an amount between $0 and $500.").

### csat (`csatApi`, `api/csat.ts`)
| function | method + path | request | response | errors |
|---|---|---|---|---|
| `csatApi.getCsatSurvey()` | `GET /api/csat/survey` | — | `CsatSurvey` | — |
| `csatApi.updateCsatSurvey(survey)` | `PUT /api/csat/survey` | `CsatSurvey` | `CsatSurvey` | 422 (validation) |

### search + guidance reads + users list (`directoryApi`, `api/directory.ts`)
| function | method + path | request | response | errors |
|---|---|---|---|---|
| `directoryApi.search(q)` | `GET /api/search?q=` | query | `SearchResults { tickets, customers, articles }` (max 5 each) | — |
| `directoryApi.listArticles()` | `GET /api/guidance/articles` | — | `GuidanceArticle[]` | — |
| `directoryApi.listMacros()` | `GET /api/guidance/macros` | — | `Macro[]` | — |
| `directoryApi.listUsers()` | `GET /api/users` | — | `User[]` | — |

### guidance + macros + sandbox (`guidanceApi`, `api/guidance.ts`)
| function | method + path | request | response | errors |
|---|---|---|---|---|
| `guidanceApi.saveArticle(input, actor)` | `POST /api/guidance/articles` (new) · `PUT /api/guidance/articles/:id` | `ArticleInput` | `GuidanceArticle` | 422 "Title is required." / "Article body is required." |
| `guidanceApi.setArticleActive(id, active)` | `PATCH /api/guidance/articles/:id` | `{ active }` | `GuidanceArticle` | 404 "Article not found" |
| `guidanceApi.importArticles(rows, actor)` | `POST /api/guidance/articles/import` | `ImportRow[]` | `{ imported, skipped }` | — |
| (client) Export CSV | `GET /api/guidance/articles/export.csv` | — | CSV file (built client-side by `downloadCsv` for now) | — |
| `guidanceApi.saveMacro(input)` | `POST /api/guidance/macros` · `PUT /api/guidance/macros/:id` | `MacroInput { name, body }` | `Macro` | 422 "Name is required.", 409 "A macro with this name already exists." |
| `guidanceApi.deleteMacro(id)` | `DELETE /api/guidance/macros/:id` | — | `{ id }` | — |
| `guidanceApi.runSandbox(question, orderNumber?)` | `POST /api/guidance/sandbox` | `{ question, orderNumber? }` | `SandboxResult` | — |

### integrations, AI settings, users (`settingsApi`, `api/settings.ts`)
| function | method + path | request | response | errors |
|---|---|---|---|---|
| `settingsApi.listIntegrations()` | `GET /api/integrations` | — | `IntegrationStatus[]` (secrets masked only; Shopify adds `widget: { embedEnabled, lastSeenAt }`) | — |
| `settingsApi.getIntegration(id)` | `GET /api/integrations/:id` | — | `IntegrationStatus \| null` | — |
| `settingsApi.saveIntegrationConfig(id, config)` | `PATCH /api/integrations/:id/config` | `{ model?: string }` | `IntegrationStatus` | 404 "Integration not found", 422 "Choose one of the available models." |
| `settingsApi.testIntegration(id)` | `POST /api/integrations/:id/test` | — | `TestResult { ok, ms, message }` | — |
| `settingsApi.testPrompt(id, model, prompt)` | `POST /api/integrations/:id/prompt` | `{ model, prompt }` | `TestResult` | — |
| `settingsApi.sendTestEmail(to)` | `POST /api/integrations/resend/test-email` | `{ to }` | `TestResult` | 422 "Enter a valid email address." |
| `settingsApi.getAiSettings()` | `GET /api/settings/ai` | — | `AiSettings` | — |
| `settingsApi.saveAiSettings(s)` | `PUT /api/settings/ai` | `AiSettings` | `AiSettings` (threshold feeds the sandbox) | 422 "Closing time must be after opening time." |
| `settingsApi.inviteUser(email, role)` | `POST /api/users/invite` | `{ email, role }` | `User` (status invited) | 422 "Enter a valid email address.", 409 "A user with this email already exists." |
| `settingsApi.updateUser(id, patch, actorId)` | `PATCH /api/users/:id` | `{ role?, status? }` | `User` | 403 "You can't change your own account" |
| `settingsApi.resetPassword(id)` | `POST /api/users/:id/reset-password` | — | `{ email }` | — |

### widget settings + install / theme editor + widget runtime (`widgetApi`, `api/widget.ts`)
| function | method + path | request | response | errors |
|---|---|---|---|---|
| `widgetApi.getWidgetSettings()` | `GET /api/widget/settings` | — | `WidgetSettings` | — |
| `widgetApi.saveWidgetSettings(settings)` | `PUT /api/widget/settings` | `WidgetSettings` | `WidgetSettings` | 422 (validation) |
| `widgetApi.getInstallStatus()` | `GET /api/widget/install-status` | — | `ShopifyInstallStatus` | — |
| `widgetApi.verifyInstall()` | `POST /api/widget/verify-install` | — | `VerifyResult { detected, message }` (follows embed status) | — |
| `widgetApi.getThemeEmbed()` | `GET /api/shopify/theme-embed` | — | `ThemeEmbedSettings` | — |
| `widgetApi.saveThemeEmbed(theme)` | `PUT /api/shopify/theme-embed` | `ThemeEmbedSettings` | `ThemeEmbedSettings` (also updates `embedEnabled`) | — |
| `widgetApi.getEffectiveWidgetSettings()` | `GET /api/widget/effective-settings` | — | `{ settings: WidgetSettings, embedEnabled }` (what `widget.js` renders) | — |
| `widgetApi.stashDeskPreview(settings)` | client only | `WidgetSettings` | `void` (one-shot `localStorage` hand-off) | — |
| `widgetApi.takeDeskPreview()` | client only | — | `WidgetSettings \| null` (read once, then cleared) | — |
| `widgetApi.listStoreProducts()` | demo storefront only (Shopify Storefront API in production) | — | `StoreProduct[]` | — |
| `widgetApi.getLoggedInCustomer()` | `GET /api/widget/customer` (Shopify customer token) | — | `WidgetCustomer` | — |
| `widgetApi.getWidgetCsatQuestions()` | `GET /api/widget/csat-questions` | — | `CsatQuestion[]` (same store as CSAT Settings) | — |
| `widgetApi.sendChatMessage(text, ctx)` | `POST /api/widget/messages` | `{ text, ...ChatContext }` | `ChatReply { text, order?, handoff? }`. **Scripted** replies, not real AI | — |
| `widgetApi.submitOfflineMessage(input)` | `POST /api/widget/offline-messages` | `OfflineMessageInput` | `{ ok: true }` | 422 "Enter a valid email address." |
| `widgetApi.submitWidgetCsat(answers)` | `POST /api/widget/csat` | `CsatAnswers` | `{ ok: true }` | — |
| `widgetApi.sendTranscript(email)` | `POST /api/widget/transcript` | `{ email }` | `{ email }` | 422 "Enter a valid email address." |

### survey (`surveyApi`, `api/survey.ts`)
| function | method + path | request | response | errors |
|---|---|---|---|---|
| `surveyApi.getSurvey(token)` | `GET /api/surveys/:token` | — | `SurveyLookup` (`valid` / `invalid` / `completed`) | — |
| `surveyApi.submitSurvey(token, answers)` | `POST /api/surveys/:token/responses` | `CsatAnswers` | `{ ok: true }` (the token becomes completed) | 410 "This survey link isn't valid" |

### Infrastructure (not endpoints)
| export | file | purpose |
|---|---|---|
| `client.request(resolve, { empty })` | `api/client.ts` | The single mock transport: latency, demo state, `structuredClone` of the result |
| `client.ApiError` | `api/client.ts` | Error class `{ message, status }` (re-exported from `@/api`) |
| `db.db`, `db.CSAT_QUESTIONS_KEY`, `db.syncFraudFlag(ticketId)` | `api/db.ts` | In-memory copy of the seed (resets on reload), the sessionStorage key for CSAT questions, and re-deriving a ticket's fraud flag from its open alert |
| `demoState.getDemoState()`, `demoState.setDemoState(s)`, `demoState.subscribeDemoState(fn)` | `api/demoState.ts` | Global demo-state store (re-exported from `@/api`) |

## 6. Types

All of these live in `src/types/index.ts`.

**Enums / unions:**
- `LauncherPosition` (`top-left` | `top-right` | `bottom-left` | `bottom-right`, the 2x2 position grid)
- `ContactField` (one contact-form field: `id: ContactFieldType`, label, enabled, required, topic `options`)
- `NewTicketInput` (the "+ New" ticket composer payload)
- Phase 9 also adds `BrandVoice`, `TestTurn`, `ConversationTestInput`, `ContactFormSettings`, `EmailChannelSettings`, `NotificationPrefs`, `ChangePasswordInput`; `Ticket.setAside`, `IntegrationStatus.configured` / `attention`, `GuidanceArticle.version` / `history`, `FraudAlert.reviewNote`, `AiSettings.assignment`
- `Channel` (`email` | `chat`)
- `TicketStatus` (`open`, `ai_handling`, `grok_handling`, `needs_human`, `resolved`, `closed`)
- `Priority`
- `Resolver` (`claude` | `grokbot` | `human`)
- `AuthorType` (`customer`, `claude`, `grokbot`, `agent`, `system`)
- `Role` (`admin` | `agent`)
- `UserStatus` (`active`, `invited`, `deactivated`)
- `AITier`
- `EscalationReason`
- `OrderStatus`
- `CsatQuestionType`
- `DelayUnit`
- `RangePreset`
- Loop types: `LoopState` (open, in_review, closed, cancelled, expired), `LoopOutcome` (refund, exchange, store_credit, gift_card), `LoopLabelStatus` (label_created, in_transit, delivered_to_warehouse), `LoopReturnItem`, `LoopReturn` {id, customerId, orderNumber, state, outcome, returnTotal, refund, exchangeTotal, storeCredit, items[], labelStatus, createdAt, adminUrl}.
- Inbox panel types: `FinancialStatus`, `FulfillmentStatus`, `ShippingAddress`. `Customer` (+ `phone`, `tags`, `shopifyCustomerId: string | null` (null = guest), `adminUrl`), `ShopifyOrder` (+ `financialStatus: FinancialStatus` paid/pending/partially_refunded/refunded, `fulfillmentStatus: FulfillmentStatus` unfulfilled/fulfilled/in_transit/delivered, `shippingAddress: ShippingAddress`, `adminUrl`), `LineItem` (+ `image` from /images/products).
- Phase 8: `RefundStage` (`requested`, `approved`, `refunded`, `declined`, `on_hold`), `RiskLevel` (`high` ≥75, `medium` 45–74, `low` <45), `FraudAction` (`safe`, `held`, `escalated`), `FraudStatus` (`open` + `FraudAction`), `FraudSignalCode`. Records: `RefundRecord` (+ `recommendation`), `FraudSignal`, `FraudAlert` (+ `refundId`), `FraudReviewResult`, `TicketFraudFlag`, `AutoRefundSettings`, `RefundSummary`.
- `KpiFormat`
- `InboxViewId`
- `IntegrationId` (`outlook`, `shopify`, `claude`, `grokbot`, `resend`)
- `IntegrationState` (`connected`, `error`, `not_configured`)
- `RuleCondition`
- `StorePageType`
- `SharedWidgetField`
- `SettingSource` (`desk` | `theme`)
- `LauncherIcon`
- `WidgetState` (8 widget states)
- `CsatStyle` (`stars`, `emoji`, `numeric`)
- `FieldMode` (`required`, `optional`, `off`)

| type | fields (summary) |
|---|---|
| `User` | id, name, email, role, status, lastLoginAt |
| `SessionUser` | the signed-in `User` plus the active (viewed-as) role |
| `Invite` | token, email, role, invitedBy, expired |
| `LineItem` | title, variant, quantity, price, image |
| `ShopifyOrder` | number, createdAt, status `OrderStatus`, total, lineItems, tracking |
| `Customer` | id, name, email, location, totalSpent, orders `ShopifyOrder[]`, tags |
| `CustomerRef` | id, name, email (embedded in tickets) |
| `Ticket` | id `GB-####`, subject, channel, status, priority, customer, assignee, tags, resolvedBy, escalationReason, csatScore, createdAt, updatedAt |
| `Message` | id, ticketId, authorType, authorName, body, createdAt, isInternal, format, approvedBy |
| `AIAttempt` | id, ticketId, tier, model, confidence, outcome, reason, latencyMs, createdAt |
| `AIDraft` | id, ticketId, tier, body, confidence, guidanceIds, createdAt |
| `GuidanceArticle` | id, title, category, tags, body (markdown), active, updatedAt, updatedBy |
| `Macro` | id, name, shortcut, body, tags, usageCount, updatedAt |
| `CsatQuestion` | id, type, text, required, options |
| `CsatSurvey` | questions, sendDelay `{ value, unit }`, channels, lowScoreRecipients |
| `CsatResponse` | id, ticketId, score, comment, channel, resolver, createdAt |
| `DailyMetric` | date, per-channel volume, resolutions, response/resolution times, CSAT |
| `DateRange` | from, to (ISO dates) |
| `KpiMetric` | key, label, value, previous, format, betterWhen, hint, series |
| `ScoreSplit<K>` | key, label, average, count |
| `CsatSummary` | average, previous, responseRate, distribution, trend, byChannel, byResolver, comments, lowScores |
| `DashboardSummary` | range, comparisonLabel, kpis, volume, resolvedBy, escalationReasons, topTags, csat |
| `SearchCustomerResult` / `SearchResults` | grouped search results (tickets, customers, articles) |
| `TicketDetail` | ticket, messages, drafts, attempts, customer, pastTickets, guidanceTitles |
| `TicketPatch` / `BulkPatch` / `NewMessage` | ticket mutation DTOs (see section 5) |
| `IntegrationStatus` | id, name, description, status, lastSyncAt, error, envVar, secretPreview (masked), details, models, model, checklist |
| `TestResult` | ok, ms, message |
| `EscalationRule` | id, condition `RuleCondition`, value, target (`grokbot` \| `human`) |
| `BusinessDay` | day, open, from, to |
| `AiSettings` | threshold, autoSend `{ email, chat } × { claude, grokbot }`, timezone, hours, rules, prompts |
| `SandboxResult` | articles (ranked, scored), draft, confidence, threshold, wouldEscalate, order, orderNotFound |
| `ArticleInput` / `MacroInput` / `ImportRow` | guidance write DTOs |
| `Offset` | x, y (px) |
| `WidgetSettings` | branding (7 colors, logo, avatars, font, radius, shadow), launcher, messaging, display, csat, sources |
| `ThemeEmbedSettings` | enabled, primary, accent, launcherPosition, hideOnMobile |
| `VerifyResult` | detected, message |
| `ShopifyInstallStatus` | shopDomain, embedEnabled, themeName, lastSeenAt, method (`app_embed` \| `script_tag` \| `none`) |
| `StoreProduct` | id, name, price, image, colors, tag |
| `WidgetCustomer` | firstName, name, email, orders |
| `WidgetOrderCard` | number, status, productTitle, variant, image, carrier, trackingUrl, eta |
| `ChatContext` | identity, pageType, pagePath, cart/product context |
| `ChatReply` | text, order?, handoff? |
| `OfflineMessageInput` | name, email, message |
| `CsatAnswers` | answers keyed by question id |
| `SurveyLookup` | `{ status: 'valid', ticket, questions }` \| `{ status: 'invalid' }` \| `{ status: 'completed' }` |

**Effective widget settings:** take the Desk `WidgetSettings`, then pull every field where `sources[field] === 'theme'` from `ThemeEmbedSettings` (`lib/widgetRules.mergeEffective`). In the seed, primary and accent come from Desk, and launcher position and hide-on-mobile come from the theme editor.

## 7. Swapping mocks for real endpoints

1. **One transport module.** Every mock goes through `request()` in `src/api/client.ts`. This is where latency and the demo state are injected. Replace it with a `fetch` wrapper, for example `http<T>(method, path, body)`. That wrapper should:
   - add the auth header;
   - on a non-2xx response, throw `new ApiError(body.message, res.status)`.
2. **Then each domain file** (`auth.ts`, `tickets.ts`, `inbox.ts`, `dashboard.ts`, `csat.ts`, `directory.ts`, `guidance.ts`, `settings.ts`, `widget.ts`, `survey.ts`) swaps its `request(() => …db…)` body for `http(...)`, using the method and path in section 5. Signatures and return types stay the same.
3. **Delete `src/api/db.ts` and `src/mocks/`.** Nothing outside `src/api` imports them; `grep -r "@/mocks" src/components src/pages` returns nothing.
4. **Demo states.** Keep `demoState.ts` if you still want Loading/Empty/Error for demos (check it in the wrapper), or remove `DemoStateSwitcher` from `App.tsx`.
5. **Auth.** `components/auth/AuthContext.tsx` keeps the `SessionUser` in `sessionStorage`. Replace that with your real session or token.
6. **Actors.** Drop the `actor` / `actorId` arguments server-side and derive them from the token instead.

## 8. Chat widget: Shadow DOM and the future widget.js

`SupportWidget` (`components/widget/SupportWidget.tsx`) is the only widget implementation. It renders entirely from a `WidgetSettings` object.

**Props:**
| prop | type | purpose |
|---|---|---|
| `settings` | `WidgetSettings` | Everything the widget shows |
| `mode` | `'live' \| 'contained'` | `live` is portaled to `body` and fixed to the viewport. `contained` sits inside the nearest positioned parent (admin preview, theme editor, styleguide). |
| `forcedState` | `WidgetState` | Initial state. Remount it (`key`) to jump again. |
| `pageType` / `pagePath` | `StorePageType` / `string` | Page-type rules, URL include/exclude, proactive pages |
| `loggedIn` | `boolean` | Skips pre-chat and greets the Shopify customer by first name |
| `outsideHours` | `boolean` | Applies `display.outsideHours` |
| `viewport` | `'auto' \| 'desktop' \| 'mobile'` | Below 640px the panel becomes a full-screen sheet |
| `typing` | `boolean` | Styleguide only: starts with the typing indicator showing |

**Isolation:**
- `ShadowRoot.tsx` calls `attachShadow({ mode: 'open' })` on `<div data-goorin-widget>` and portals the widget inside.
- `widget.css` is imported with `?inline` and injected as a `<style>` element inside the shadow root. It is plain px-based CSS, not Tailwind and not rem.
- Document selectors cannot reach the shadow tree. `:host { all: initial !important }` stops inherited styles, and theme values are inline `--gw-*` custom properties.
- "Inherit from store theme" reads the computed `font-family` of the element the host is mounted in.
- `WidgetErrorBoundary` contains any crash.
- Proof: the "Hostile store CSS" toggle on `/widget-demo`.

**Accessibility:**
- The panel is a labelled `role="dialog"` with a focus trap, using `shadowRoot.activeElement`.
- Esc minimizes the panel and returns focus to the launcher.
- New messages are announced through a polite live region.
- On mobile the sheet locks page scroll and respects the safe area.

**Path to `widget.js`:**
1. Add a Vite library entry (IIFE format) that exports a `mount()`. It should:
   - create the host element;
   - render `SupportWidget` in `live` mode inside `ShadowRoot`;
   - bundle `widget.css?inline` and React (or Preact/compat, to keep it under about 60 kB gzip).
2. On load, the script reads `data-shop` from its `<script>` tag, then:
   - calls `GET /api/widget/effective-settings?shop=`;
   - exits if `embedEnabled` is false;
   - evaluates the display rules (`lib/widgetRules`) for `location.pathname`, then mounts.
3. The Shopify App Embed block (or the script-tag fallback shown in Install) only includes `<script src="$APP_BASE_URL/widget.js" data-shop="goorin.myshopify.com" async></script>`.

**Scripted chat triggers (mock):**
- "Track my order" (or any mention of order / tracking / shipping) returns an order card.
- "talk to a person" / human / agent, or "Wholesale", starts the handoff.
- "Sizing help" and "Returns" get canned answers.
- The logged-in demo customer is Dev Patel, and the greeting bubble appears after 5 s.

## 9. Demo tools, mock auth, persistence

**Title font picker (Phase 8).** It sits in the same demo popover with the same visibility rules (`title-font-option-inter-display|geist|manrope|jakarta`). It switches the `--font-title` and `--title-scale` CSS variables app-wide (`lib/titleFont.ts`) and saves the choice in localStorage `goorin.titleFont`. Inter Display is the default and ships in the main bundle. Geist, Manrope and Plus Jakarta Sans are lazy-loaded chunks.

**Demo state switcher.** The floating pill at the bottom right appears in dev or when `VITE_DEMO_TOOLS=true`. It sets a global mode that `request()` reads:
- **Live:** mock data after latency.
- **Loading:** promises never resolve, so skeletons show.
- **Empty:** list/summary endpoints return empty values.
- **Error:** every request throws `ApiError` 500, and pages show `ErrorState` with "Try again".

On `/widget-demo` the switcher moves so it doesn't cover the launcher.

**Mock auth rules:**
- Any valid email plus any non-empty password signs in as **Ava Martinez (Admin)**.
- `error@goorin.com` returns "Incorrect email or password."
- The user menu has "View as" Admin/Agent. Agent hides Settings.
- `/login?invite=<any>` accepts an invite as Priya (Agent). `/login?invite=expired` shows the expired state.

**Reset on reload.** All mock data lives in memory (`api/db.ts`) and resets on every page load. There are two persistence exceptions, plus a one-shot hand-off:

| what | where | why |
|---|---|---|
| Session + selected role | `sessionStorage['goorin.session']` | You stay signed in across reloads in the same tab |
| CSAT **questions only** | `sessionStorage['goorin.csatQuestions']` | The hosted survey reflects drawer edits. Send delay, channels and recipients reset to defaults. |
| One-shot preview hand-off | `localStorage['goorin.deskPreview']` | "Preview on my store" passes the unsaved draft to a new tab. It is read once and then cleared. |

## 10. Quality checks

| check | command | result at handoff |
|---|---|---|
| TypeScript | `yarn typecheck` | 0 errors |
| No mock imports in UI | `grep -rn "@/mocks" src/components src/pages` | none |
| No Emergent packages | `grep -i emergent package.json` | none |
| README coverage (Q-34) | `node scripts/check-readme.mjs` | 0 missing api functions / component files / types |
| axe WCAG 2.1 A/AA serious+critical (Q-35) | `node scripts/audit.mjs http://localhost:4173` against `yarn build && npx vite preview --port 4173` | 0 on every route |
| Focus ring | the same audit tabs through each route and flags focused elements without an outline or ring | none flagged. The native time inputs' clock button has its ring on `::-webkit-calendar-picker-indicator`, which getComputedStyle can't read, so it was checked by screenshot instead |
| Horizontal overflow at 768 / 1024 | the same audit, signed-in routes | 0 px everywhere |
| Console errors | the same audit (preview build; the dev server's HMR websocket is excluded by running against `vite preview`) | 0 |
| Phase journeys | `node scripts/phase11-check.mjs`, `phase12-check.mjs`, `phase13-check.mjs` (+ `phase11-final.mjs` evidence shots) | see the phase report |

### Workflows (`components/workflows`), Phase 13
| file | exports | purpose |
|---|---|---|
| `components/workflows/WorkflowsTab.tsx` | `WorkflowsTab` | List: stats strip, "+ New workflow" (blank / template), rows (trigger, channel icons, status + switch, runs, completed %, edited, ⋯), duplicate-trigger warning, templates, empty state |
| `components/workflows/WorkflowEditor.tsx` | `WorkflowEditor` | Name, On/Off (blocked by issues), List / Canvas toggle (List only below 1024), issues list, settings panel (bottom sheet on phones), Test workflow, sticky save bar |
| `components/workflows/StepList.tsx` | `StepList`, `AddStepMenu` | Numbered step cards with + inserts, branches as side-by-side columns, "Go to / Continue at step N" markers, drag or Move up/down |
| `components/workflows/StepCanvas.tsx` | default `StepCanvas` | React Flow canvas: pan, zoom, fit, minimap, connect handles, delete arrows, drop from "Add step", Tidy up |
| `components/workflows/StepSettings.tsx` | `StepSettings`, `TriggerSettings` | One-line inputs per step type and variable chips |
| `components/workflows/TestPanel.tsx` | `TestPanel`, `ChatThread`, `MockInbox` | Chat / Contact form / Email switch, chat preview, "Customer inbox (mock)", run log, Reset; tests unsaved changes |
| `components/workflows/stepMeta.tsx` | `STEP_ICON`, `stepSummary`, `VarText`, `UnknownIcon` | Step icons, one-line summaries, `{{var}}` chips |

## 11. Brand assets

**Files** (in `public/images/brand/`):
- `goorin-wordmark-black.svg` and `goorin-wordmark-cream.svg`: the official GOORIN wordmark, aspect 6.2:1, never stretched.
- `goorin-castle-mark.svg`: the castle mark.

**Components:** `GoorinWordmark`, `GoorinCastle` and `GoorinMonogram`.

**Where the wordmark is used:**
- Black: login, the storefront header and the mini stores.
- Cream: the survey header and the widget's default header logo.

**Sidebar:**
- The surface is white.
- Collapsed: a white castle on a brass `#B08D57` tile.
- Expanded: the 160px black wordmark centered over a "Support Desk" label.
- The active item is a raised `#F3EEE7` tile with a 3px brass bar on its own left edge.
- The collapse toggle sits in the bottom section, on the Settings row.

**Favicon:** a white castle on a brass rounded tile (`public/favicon.svg`).

## 12. Seed facts

- **Phase 11 (AI-first Inbox, supersedes the Phase 10 layout):**
  - Views in order: Needs you (default, 7), Assigned to me, AI handling, Resolved, All; saved views; More › Closed, Spam, Trash. Docked column only at ≥1600; below that, the list-header switcher (phone: chips + Views sheet).
  - Needs you (7): with AI draft GB-1076, GB-1074, GB-1068, GB-1065, GB-1061, GB-1058; without a draft GB-1071 (also the <3-message handover). SLA 24h: breached ≥24h, close ≥18h.
  - AI handling: Replying = `ai_handling`, Waiting on customer = `grok_handling`, Resolved by AI today = resolved by Claude/Grokbot today. Status line: 128 handled by AI today (`inboxApi.HANDLED_BY_AI_TODAY`).
  - GB-1065 (Marcus Bell) has 2 past tickets. #GB19790: $160 = Dulles Newsboy $78 (refunded) + Sage Bucket Hat $82 (refundable).
  - New APIs: `inboxApi.takeOver`, `inboxApi.handBack`, `inboxApi.generateDraft`, `inboxApi.enrich` (adds `draftReady`, `handoverReason`, `aiConfidence`), `assistantApi.briefFor`, `assistantApi.SOURCE_LABEL`, `assistantApi.FALLBACK`, `viewsApi.editOrder`, `viewsApi.duplicateOrder`, `viewsApi.createOrder`, `viewsApi.searchProducts`, `viewsApi.orderTotal`, `viewsApi.actorId` (Agent role acts as Sam Okafor).
  - Components: `components/inbox/WhyBrief.tsx`, `components/inbox/SummaryPanel.tsx`, `components/inbox/DraftCard.tsx` (draft-first composer), `components/styleguide/Phase11Samples.tsx`. `lib/inboxViews.ts` adds `aiState`, `waiting`, `sortNeeds`. Types: `Ticket.draftReady/handoverReason/aiConfidence`, `ShopifyOrder.isDraft/discount`, `InboxViewId` now `needs_you`… (old ids alias).
  - StatusPill (app-wide): 22px, dot + tint, no border or icon.
- **Phase 10 (Modern Inbox):**
  - Saved views: Shared `VIP & wholesale` (2), `Damaged on arrival` (4), `Sizing help` (3), all created by Ava; Private `My follow-ups` (Ava).
  - Default view counts (Ava): Assigned to me 2, Unassigned 17, All 40. Needs human 7.
  - Teams: Support, Returns, Wholesale. GB-1076 and GB-1071 are Returns, GB-1074 Wholesale, GB-1064 Support.
  - Handover with a full summary (≥3 messages): GB-1076 (4 messages, "Damaged item / Replacement"). Short handover (<3 messages, "Try again"): GB-1071 (2 messages).
  - AI draft awaiting approval: GB-1076.
  - Partially refunded orders: #GB19790 (Margaret, $160, $78 already refunded, $82 refundable) and #GB20360. Auto-refund limit $75.
  - One Shopify store (goorin-bros), no store selector. Customer notes (the new Note row) and metafields start empty.
- **Components (Phase 10):** `components/inbox/InboxViewsPanel.tsx` (views panel + `SaveViewDialog`), `components/inbox/AskGoorinAI.tsx` (⌘G / Ctrl+G sheet), `components/inbox/HandoverCard.tsx` (summary + reason), `components/inbox/OrderActions.tsx` (Edit / Duplicate / Refund / Create order dialogs), `components/inbox/PanelParts.tsx` (ticket tags + fields, customer rows, past tickets, store select). `components/styleguide/Phase9Samples.tsx` and `components/styleguide/Phase10Samples.tsx` hold the Phase 9 and Phase 10 styleguide samples.
- **Types (Phase 10):** `TeamId`, `SavedView`, `SavedViewFilters`, `OrderRefundInput`; `Ticket.team`, `Ticket.snoozedUntil`, `ShopifyOrder.refundedAmount`, `ShopifyOrder.shippingCost`.
- **Tickets:** 40, `GB-1041`…`GB-1080`.
  - 5 open, 5 ai_handling, 4 grok_handling, **7 needs_human**, 12 resolved, 7 closed.
  - Email and chat.
- **Other records:** 20 customers with Shopify orders, 15 guidance articles (14 active), 8 macros, 3 users (Ava Admin, Sam Agent, Priya invited).
- **Metrics:** 180 days of daily metrics (90 selectable, plus 90 days of history so the 90d range has a prior period).
- **CSAT:**
  - 14 hand-written commented responses, 4 of them scored ≤2.
  - The default send delay is 2 hours.
  - Survey tokens `tok_GB1066` and `tok_GB1070` are valid.
- **Integrations:**
  - Outlook, Shopify and Claude are connected.
  - Grokbot is in error (401).
  - Resend is not configured.
  - Masked secrets show the env var names `OUTLOOK_CLIENT_SECRET`, `SHOPIFY_ADMIN_API_TOKEN`, `ANTHROPIC_API_KEY`, `XAI_API_KEY` and `RESEND_API_KEY`.
- **Refunds (Phase 8):** 30 records (`rf-201`…`rf-206` hand-placed, `rf-001`…`rf-024` spread over ~90 days). At 90d: 4 requested (awaiting approval: GB-1064 $168, GB-1068 $451, GB-1071 $96, GB-1076 $210 = $925), 1 approved, 1 on hold, 3 declined, 21 refunded, $2,907 refunded. At **30d**: 14 refunds, $826 refunded (−32% vs prior), 30% auto-refunded by AI, pending 4 · $925. Auto-refund limit $75 (on).
- **Loop returns:** 7 returns across 6 customers. Margaret Okonkwo (GB-1076): `48213` closed refund $58 for #GB19790 (the partially refunded order), plus `48690` cancelled, for a 12.3% rate. Clara Bianchi (GB-1068): `49102`, $303 of $451, 67.2%, High return rate. Samuel Adeyemi 100%, Imogen Clarke 34.5% (exchange, in review), Hannah Whitlock 25.1% (store credit, open), Theo Ramirez expired gift card (0%). Everyone else has none.
- **Fraud alerts (Phase 8):** 8 alerts, 4 open. `fa-101` on **GB-1064** is HIGH 91 and linked to pending refund `rf-201`. `fa-102` GB-1068 Medium 68 (→ `rf-202`), `fa-103` GB-1077 Low 38, `fa-104` GB-1071 Medium 57 (→ `rf-203`). Reviewed: `fa-105` safe, `fa-106` held, `fa-107` escalated, `fa-108` safe.
- **Shopify:** goorin.myshopify.com, theme "Dawn – Goorin 2026", App embed enabled.

## Fix round (iterations 15–16)

- **Workflows:** editor Back uses the unsaved-changes guard; "+" inserts exactly where clicked in List and Canvas (edge "+" buttons rewire both ends); variable picker uses a must-set dataflow over every upstream path, and uses of unset variables are issues; routing rules reorder by drag or Move up/down; stats include "Handed to a person"; row menu has Test, Rename dialog and "Delete <name>?" confirm; Test panel starts idle and the first customer message (or the quick reply) is the trigger, matched by `matchesTrigger` (shared with the widget runtime); hat-size "I don't know" shows the measuring tip and re-asks; Return template ends with `#LR-<n>` and a "Download return label" link; widget shows order cards.
- **Inbox:** one fluid column (`clamp(720px, 88%, 1280px)`, gutters 24/32/48px) shared by header, thread and draft dock; header meta = identity · divider · 28px controls, degraded by available width; draft composer card holds its actions; `shadow-glow-ai` (tokens) is used only on "Why you're here"; the sidebar keeps the user's collapse choice on every page; the summary docks at ≥1600px and is a rail + overlay drawer at 1024–1599.
- **Customer panel:** `DetailParts.tsx` (Section accordion, KV grid, Identity, StatsGrid) is shared by Summary, Details and the phone sheet.
- **Copy:** the UI says "AI" instead of "Claude"; "Claude" remains only in configuration (Settings → Integrations, AI replies model tiers/threshold copy, Grokbot system prompt) and docs.

## Phase 14: chat widget redesign + Channels chat settings (MOCKED)

- **Widget** (`components/widget/Home.tsx`, `widget.css` Phase 14 block): a 400px panel with a 28px radius. It's frosted (`color-mix(panel 88%)` + `backdrop-filter: blur(24px)`) and falls back to solid where blur isn't supported. Floating 40px controls (Back, Cart, Track orders, Close) replace the title bar. Home shows the greeting, stacked starter chips, an "Ask anything" pill input and the "AI notice • Privacy" footer. The panel is 580px tall on Home and 680px in a conversation.
- **Conversation:** AI replies are plain 15px/1.55 text with thumbs up/down (the selected thumb is a filled dark circle). Customer messages are right-aligned pills. The input reads "Reply" and the footer has a small "End chat" link.
- **Actions:** "Where is my order?" and Track orders start the active Order tracking workflow. Starters can Ask the AI, Start a workflow (an Off workflow falls back to the AI) or Open a link. "See last conversation" appears after a chat. Cart opens a mock drawer on /widget-demo and shows a toast in the preview. "Ask for email before chat" is Off by default.
- **Settings** (`WidgetSettings.home`, `.conversation`, `branding.panelStyle/panelColor`): Channels has one tab level (Chat · Contact form · Email · Installation). The Chat tab has a ≤640px settings column and a sticky 440px preview with Desktop/Phone and Home/Conversation/Order tracking controls. Sections: Look (compact colour rows with a popover picker), Launcher (mini corner picker, px spacing inputs), Home screen (top buttons, starters editor: drag or ↑↓, ≤40 chars, max 8), Conversation, Display rules, CSAT in chat.
- **Preview:** just the widget on a quiet canvas-coloured surface, with no mock storefront and no "On my store" button. The panel is centred with the launcher below and to the right. Desktop renders at real size and scales down to fit the viewport (`preview-stage[data-scale]`). Phone shows the same full-height sheet inside a plain rounded outline. Home, Conversation and Order tracking always open the panel in that state. Closing the panel and then clicking the launcher, or clicking the view again, resets it. "Outside business hours" is a switch in the preview header and shows the offline form when Display rules use it.
- **Types:** `WidgetStarter` (`{ id, label, action, workflowId?, url? }`) and `StarterAction` (`'ai' | 'workflow' | 'link'`), stored in `WidgetSettings.home.starters`.
- **Styleguide:** `components/styleguide/Phase14Samples.tsx` (`Phase14Samples`): frosted panel, launcher, starter chips, AI and customer messages, thumbs.
- **Font:** defaults to Goorin sans so the preview matches /widget-demo. "Inherit from store theme" is an explicit opt-in.
- **Check:** `scripts/phase14-check.mjs` covers JRN-168..176, including the frosted-panel contrast sample.
