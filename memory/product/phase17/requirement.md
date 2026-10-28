# Phase 17 — Guidance page refinement

Version: phase-17

## Goal
Make Guidance feel as organized and premium as the refined Inbox, Dashboard and AI & Workflows pages: one clear article library (no section tabs), category navigation with counts, readable rows that show what the AI actually uses, a calmer two-column article editor, and a stepped CSV import. Frontend-only, mock data through `/src/api` (see `../overview.md`). Macros stay removed (REQ-856).

## Functional requirements

### Page structure
- REQ-857 [always] The Guidance page shall show no section tabs (the "Articles" / "Import CSV" tab bar is removed). (interpreted)
- REQ-858 [always] The Guidance header shall show exactly one "New article" button.
- REQ-859 [always] The Guidance header shall show an outline "Import / export" menu button with the items "Import CSV…", "Export all articles (CSV)" and "Download sample template".
- REQ-860 [event] When the user picks "Import CSV…", the system shall open the CSV import dialog over the article list.
- REQ-861 [event] When the user opens /guidance?tab=import, the system shall show the article list with the CSV import dialog open.
- REQ-862 [unwanted] If the user opens /guidance?tab=macros or any unknown tab value, then the system shall show the article list at /guidance.
- REQ-863 [event] When the user picks "Export all articles (CSV)", the system shall download guidance-articles.csv containing every article. (no failure mode)
- REQ-864 [always] Under the page title the system shall show a summary line "<n> articles · <n> active · <n> off" matching the mock data. (interpreted)
- REQ-865 [optional] Where the user is an Admin, the system shall show a quiet link "Brand voice and workflows live in AI & Workflows" to /ai. Agents do not see it.
- REQ-866 [always] Agents shall keep full edit rights in Guidance (create, edit, toggle, import, export).

### Library navigation
- REQ-867 [state] While the screen is 1024px wide or more, the system shall show a category list left of the articles with "All articles" first and every category with its article count.
- REQ-868 [state] While the screen is narrower than 1024px, the system shall show the categories as one horizontally scrolling chip row with counts.
- REQ-869 [event] When the user picks a category, the system shall show only that category's articles and highlight the picked category. (no failure mode)
- REQ-870 [always] The toolbar shall show a status control with "All", "Active" and "Off", each with its count.
- REQ-871 [always] The toolbar shall show a Tag filter select.
- REQ-872 [always] The toolbar shall show a Sort select with "Recently updated" (default), "Most used by AI" and "A–Z". (interpreted)
- REQ-873 [always] Search shall match article titles and body text.
- REQ-874 [unwanted] If no article matches the search and filters, then the system shall show "No articles match" with a "Clear filters" button that resets search, category, status and tag.

### Article rows
- REQ-875 [always] Each row shall show the article title.
- REQ-876 [always] Each row shall show a one-line plain-text excerpt of the body with markdown symbols (#, *, |, -) removed.
- REQ-877 [always] Each row shall show the category name and up to 2 tags followed by "+<n>" for the rest.
- REQ-878 [always] Each row shall show "Updated <relative time> by <name>" (for example "Updated 5 days ago by Ava Martinez") instead of a clock time.
- REQ-879 [always] Each row shall show "Used in <n> AI replies · 30 days", served from mock data through `/src/api`. (interpreted)
- REQ-880 [state] While an article is off, its row shall appear muted with an "Off" label and "Used in" shall read "Not used by the AI".
- REQ-881 [event] When the user flips a row's switch, the system shall update that row, the status counts and the summary line immediately with the toast "Article activated" or "Article turned off".
- REQ-882 [unwanted] If the toggle save fails, then the system shall put the switch back with the toast "Couldn't update the article. Try again."

### Article editor
- REQ-883 [state] While the screen is 1280px wide or more, the editor shall show the writing area on the left and a settings panel on the right.
- REQ-884 [state] While the screen is narrower than 1280px, the editor shall stack the settings panel below the writing area.
- REQ-885 [always] The writing area shall start with a large title field placeholder "Article title".
- REQ-886 [always] The body shall have a formatting toolbar with Bold, Italic, Heading, Bulleted list, Numbered list and Link, each inserting markdown at the cursor.
- REQ-887 [state] While the screen is 1280px wide or more, the editor shall offer "Write", "Split" and "Preview" views, defaulting to "Split".
- REQ-888 [state] While the screen is narrower than 1280px, the editor shall offer "Write" and "Preview" views, defaulting to "Write".
- REQ-889 [always] The settings panel Status switch shall read "The AI uses this article" when on and "The AI ignores this article" when off.
- REQ-890 [always] The Category field shall be a select listing existing categories plus "New category…", which reveals a text field.
- REQ-891 [always] The Tags field shall be a chip input where Enter or comma adds a tag, × removes it, and a duplicate tag is ignored.
- REQ-892 [always] The settings panel shall show Details (version, last updated by, AI uses in 30 days) and a compact Version history list for existing articles.
- REQ-893 [state] While the editor has unsaved changes, the system shall show the app's shared unsaved-changes bar pinned to the bottom with "Discard" and "Save", never covering editor content.
- REQ-894 [event] When the user saves, the system shall return to the list with the toast "Article saved", the article first under "Recently updated" and its version increased by 1.
- REQ-895 [unwanted] If the title is empty on Save, then the system shall show "Title is required." under the title and not save.
- REQ-896 [unwanted] If the body is empty on Save, then the system shall show "Article body is required." under the body and not save.
- REQ-897 [unwanted] If the user leaves the editor with unsaved changes, then the system shall ask "Discard unsaved changes?" before leaving.

### CSV import
- REQ-898 [always] The import dialog shall show three steps "Upload", "Map columns" and "Review & import" with the current step highlighted.
- REQ-899 [always] The Map columns step shall show one row per article field (Title, Body, Category, Tags, Active), each with a CSV-column select, plus a 5-row preview.
- REQ-900 [unwanted] If the user drops a non-.csv file, then the system shall show "Only .csv files are supported."
- REQ-901 [unwanted] If Title is not mapped, then the system shall show "Map a column to Title." and disable Import.
- REQ-902 [event] When the import completes, the system shall close the dialog, show "Imported <n> articles" and list the new articles.
- REQ-903 [unwanted] If rows lack a title, then the system shall skip them with the toast "<n> row skipped (missing title)" or "<n> rows skipped (missing title)", with correct singular and plural.

### Clean-up and states
- REQ-904 [always] Guidance code shall contain no unused Test sandbox component and no "Grokbot" or "Settings → AI" wording. (interpreted)
- REQ-905 [always] Loading, Empty and Error states for the list shall stay designed and reachable from the demo state switcher.
- REQ-906 [state] While on a phone (under 640px), the list shall show one-column article cards and the editor shall be full screen with the settings below the body, without horizontal scrolling.
- REQ-907 [always] Global search article results shall still open /guidance?article=<id> in the editor.

## Quality requirements
```
Q-857  Tag: Guidance.Layout
       Scale: px of horizontal overflow on list, editor and import dialog
       Meter: scripted width check at 390, 768, 1024, 1280, 1440, 1920
       Must: 0
       Plan: 0
Q-858  Tag: Guidance.Consistency
       Scale: mismatches between summary line, status counts, category counts and visible rows after 5 toggles
       Meter: scripted check
       Must: 0
       Plan: 0
Q-859  Tag: Guidance.Speed
       Scale: ms from category/status click to list updated
       Meter: browser timing, 5 trials
       Must: 300 (estimate)
       Plan: 100
Q-860  Tag: Guidance.DataSafety
       Scale: edits lost without a "Discard unsaved changes?" prompt when leaving via Back, sidebar, category or search
       Meter: scripted check, 4 exit paths
       Must: 0
       Plan: 0
Q-861  Tag: Guidance.Accessibility
       Scale: serious/critical axe violations; controls unreachable by keyboard
       Meter: axe + manual tab pass
       Must: 0
       Plan: 0
Q-862  Tag: Guidance.Look
       Scale: reviewer judgement that Guidance matches Inbox/Dashboard look (white cards, neutral greys, brown only on primary actions, no cramped or wrapped controls)
       Meter: human
       Must: no wrapped filter labels or duplicate buttons
       Plan: user calls it organized and premium
```
