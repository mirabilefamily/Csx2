# Phase 17 journeys — Guidance refinement

Seed: 15 articles in 6 categories (Sizing & Fit 3, Orders & Shipping 4, Returns & Exchanges 4, Custom & Wholesale 2, Product Care 1, Billing 1). One article is off: "Holiday shipping cutoffs (last season)". Each article gets a mock "AI uses in 30 days" count (off article = 0).

### JRN-194 Library at a glance
- superseded: [JRN-119] (tabs, duplicate New article, Active select and "v<n> · date" rows are replaced), and the "Tabs … present" part of [JRN-45]
- steps: Sign in as Admin, open Guidance at 1440px.
- expected: No tab bar. Header has one "New article" and one "Import / export" menu. Summary reads "15 articles · 14 active · 1 off". Admin sees the "Brand voice and workflows live in AI & Workflows" link. A left category list shows "All articles 15" then each category with its count. No control label wraps onto two lines.

### JRN-195 Readable article rows
- steps: Look at the "Sizing guide: measuring your head" row and the "Holiday shipping cutoffs (last season)" row.
- expected: Each row shows title, a one-line excerpt without "#", "|" or "**", category, up to 2 tags (+n if more), "Updated <relative time> by <name>" (no clock time like "3:19 AM"), and "Used in <n> AI replies · 30 days". The holiday row is muted, labelled "Off" and reads "Not used by the AI". (interpreted)

### JRN-196 Category, status, tag, sort, search
- steps: Click "Returns & Exchanges". Click status "Off". Click status "All". Pick tag "sizing". Clear it. Sort "Most used by AI", then "A–Z". Search "duties".
- expected: Returns & Exchanges shows its 4 articles and is highlighted. "Off" in that category shows "No articles match" + "Clear filters". Status pills show counts (All 15 · Active 14 · Off 1 in All articles). "Most used by AI" orders by the usage count, high to low; "A–Z" alphabetically. "duties" finds "Shipping times and international delivery" (body text match).

### JRN-197 No matches + clear
- steps: Search "zzqx". Click "Clear filters".
- expected: "No articles match" with "Clear filters"; clicking it resets search, category, status and tag and shows all 15.

### JRN-198 Toggle keeps every count in sync
- superseded: the toast copy part of [JRN-45]
- steps: Turn off "Gift cards and promo codes". Turn on "Holiday shipping cutoffs (last season)".
- expected: Toasts "Article turned off" then "Article activated". Rows update at once (muted/Off, then normal). Summary, status counts and the Billing / Orders & Shipping category counts stay correct after each flip.

### JRN-199 Calmer article editor
- superseded: the layout part of [JRN-46]
- steps: Open "Damaged or defective items" at 1440px. Use the toolbar to add a Heading and a Bulleted list. Switch Write → Preview → Split. Add tag "photos" (Enter), add "photos" again, remove it with ×. Pick "New category…" and type "Warranty". Flip Status off and on.
- expected: Large title field on top, toolbar with Bold, Italic, Heading, Bulleted list, Numbered list, Link; the inserts appear as markdown and render in the preview. Split is the default at 1440. Settings panel on the right with Status ("The AI uses this article" / "The AI ignores this article"), Category, Tags chips (duplicate ignored), Details (version, updated by, AI uses) and Version history.

### JRN-200 Save, validation and unsaved guard
- steps: In the edited article note the bottom bar, click Save. Then New article, Save empty. Type a title only, click the sidebar Inbox link.
- expected: The shared unsaved-changes bar is pinned to the bottom with "Discard" and "Save" and covers no content. Save returns to the list with "Article saved", the article first under "Recently updated", version +1. Empty Save shows "Title is required." and "Article body is required.". Leaving with changes asks "Discard unsaved changes?".

### JRN-201 Stepped CSV import
- superseded: the dialog layout part of [JRN-51]
- steps: Import / export → Import CSV…. Drop a .txt. Download sample template via the menu. Drop a CSV with 3 rows (one with no title). Unmap Title, map it back, Import. Then Import / export → Export all articles (CSV). Also open /guidance?tab=import directly.
- expected: Steps "Upload · Map columns · Review & import" with the current one highlighted. .txt shows "Only .csv files are supported.". Mapping shows one row per field (Title, Body, Category, Tags, Active) with a 5-row preview. Unmapped Title shows "Map a column to Title." and Import is disabled. Import shows "Imported 2 articles" and "1 row skipped (missing title)"; the summary becomes 17 articles. Export downloads guidance-articles.csv. /guidance?tab=import shows the list with the dialog open.

### JRN-202 Old links and search
- steps: Open /guidance?tab=macros. Open /guidance?tab=xyz. From global search pick an article.
- expected: Both land on the article list at /guidance (no macros anywhere). Search opens /guidance?article=<id> in the editor.

### JRN-203 Agent role
- steps: Switch to Agent, open Guidance, toggle an article, open and save one, open Import.
- expected: Everything works; the AI & Workflows link is hidden.

### JRN-204 Tablet and phone
- superseded: [JRN-100]
- steps: View the list, editor and import at 1024, 768 and 390.
- expected: Under 1024 categories become one scrolling chip row with counts. Under 1280 the editor offers Write / Preview (Write default) with settings stacked below. At 390 rows are one-column cards with the switch, the editor is full screen, and the import dialog is full screen with stacked mapping rows. No horizontal scroll anywhere.

### JRN-205 States and clean-up
- steps: Use the demo switcher on Guidance: Loading, Empty, Error → Try again. Search the Guidance code and UI for "Grokbot", "Sandbox" and "Settings → AI".
- expected: Skeleton rows, "No articles yet" with New article / Import actions, and the error card with Try again all render inside the new layout. None of the three strings appear in Guidance.
