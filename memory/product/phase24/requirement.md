# Phase 24 — Help Center: simple folders and subfolders

Version: phase-24 · Speed mode (UI skin)

## Goal
User: "for help desk make it more simple, traditional folders with subfolders and clear back buttons, with a nice display instead of all the pizazz". Replace the busy Help Center home with a traditional knowledge base: folders → subfolders → articles. Every level has a clear back button, the display is clean and calm, and it stays embeddable (no header or footer). The halftone hero, quick-question boxes, typing effects and inline action widgets are retired. A plain search remains.

## Functional requirements
- REQ-1110 [always] /help shall show the title "Help Center", one line "Find answers about orders, returns, sizing and more.", a plain search field, and a grid of folder cards. Each card has a simple line icon, the folder name, a one-line description and "N articles".
- REQ-1111 [always] There shall be 8 folders:
  - Orders & Shipping
  - Returns & Exchanges
  - Sizing & Fit
  - Hat Care
  - Payments & Gift Cards
  - Friday Drops
  - Wholesale & Partnerships
  - About Goorin
- REQ-1112 [always] Each folder shall have 2–4 subfolders, and each subfolder 2–5 articles, as mock customer-facing content. For example, Orders & Shipping holds Tracking your order, Shipping times & costs, International shipping, and Changing or cancelling an order.
- REQ-1113 [always] A folder page (/help/:folder) shall show a back button "← All topics", a breadcrumb (Help Center › Folder), the folder title and description, then each subfolder as a section: its name, its article titles as a list, and "See all N articles" when there are more than 5.
- REQ-1114 [always] A subfolder page (/help/:folder/:sub) shall show a back button "← <Folder>", a breadcrumb, the subfolder title, and its articles as a list (title + one-line excerpt).
- REQ-1115 [always] An article page (/help/:folder/:sub/:article) shall show a back button "← <Subfolder>", a breadcrumb, the title, "Updated <date> · N min read", a readable body (max ~70ch), "Was this helpful? Yes / No", "More in <Subfolder>" and the "Still need help? Open chat" line.
- REQ-1116 [always] Back buttons shall sit at the top-left of each page in the same spot, as clear text buttons with an arrow, at least 40px tall.
- REQ-1117 [event] When the user searches, the system shall show a results page with "N results for '<query>'", articles grouped by folder (title, breadcrumb path, excerpt), a back button "← Help Center", and a small plain "Quick answer" box at the top with 1–2 sentences and links to sources. There is no typing effect. (keeps the AI search, simplified)
- REQ-1118 [unwanted] If nothing matches, then the results page shall show "No results for '<query>'", the 8 folders, and "Open chat".
- REQ-1119 [always] Every page shall end with one slim "Still need help? Open chat" line, which sends the existing goorin:open-chat signal.
- REQ-1120 [always] The display shall be calm:
  - bone background, white square cards with 1px borders, generous spacing
  - Inter for titles and body, with the extended display font used only for the "Help Center" title
  - no halftone hero, photos, typing animation, offset-shadow hovers or inline tools
  - hover is a subtle border darkening
- REQ-1121 [state] While on a phone, folder cards shall be 1 column, breadcrumbs shorten to the back button, and the page has no sideways scroll.
- REQ-1122 [always] Old Help Center URLs (/help/topic/:slug, /help/article/:id) shall redirect to the matching folder or article.

## Quality
```
Q-882  Tag: Help.Simplicity
       Scale: user judgement "simple, traditional, clear back buttons, nice display"
       Meter: human review of shots (home, folder, subfolder, article, search, phone)
       Must: no hero photo or animations; a back button on every inner page
       Plan: user approves
```
