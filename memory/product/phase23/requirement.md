# Phase 23 — Customer Help Center (AI search + chat)

Version: phase-23 · Speed mode (UI skin; visuals first, simple mock behaviour)

## Goal
The user asked: "design a modern help desk, innovative, with chat and AI search", and sent inspiration:
- the current goorin.com Customer Support page (halftone hero, starter buttons)
- a calm editorial help library (topic cards plus a "Let's talk it through" chat card)
- the Goorin brand look: bone background, bold extended uppercase display type, mono labels, green accent, a big GOORIN wordmark footer

Build a public, customer-facing Help Center at /help that feels like goorin.com, made modern. It has one AI "ask anything" search that answers instantly with sources, quick actions, a topic library from Guidance articles, article pages, and the chat widget woven in. Frontend-only, mocks through /src/api.

## Functional requirements

### Page and brand
- REQ-1091 [always] /help shall be a public page (no login) with its own storefront-style header: GOORIN wordmark; SHOP, TRUCKERS, USA WORKSHOP, DROPS, LAST CHANCE; SEARCH, LOGIN, CART (non-functional links). The agent app shell does not appear.
- REQ-1092 [always] The look shall follow goorin.com:
  - bone background (#D9D4C7 family) and ink (#141414)
  - bold extended uppercase display headings (e.g. Archivo at 125 width / 800 weight, or Unbounded)
  - mono labels and buttons (e.g. IBM Plex Mono / Space Mono)
  - Inter for article body text
  - a Goorin green accent (#35B54A family), used sparingly (interpreted)
- REQ-1093 [always] The hero shall be a full-width halftone image band (CSS halftone dots over a hat or landscape photo) with "HI, HOW CAN WE HELP?" and the AI search bar centred on it.

### AI search
- REQ-1094 [always] The search bar shall read "Ask anything — orders, returns, sizing, Friday Drops…", with a sparkle icon, a "/" key hint and an "Ask" button. Pressing "/" focuses it.
- REQ-1095 [event] When the user types, the system shall show a suggestion panel with matching questions and articles (title + topic). Arrow keys and Enter pick an item.
- REQ-1096 [event] When the user submits a question, the system shall show an "Answer" card under the hero:
  - a short streamed-looking answer (typing effect)
  - numbered source chips linking to articles
  - 2–3 follow-up question chips
  - "Was this helpful? 👍 👎"
  - "Continue in chat", which opens the chat widget with the question and answer carried over
- REQ-1097 [event] When a question matches an action (where is my order, cancel/edit order, return, size), the answer card shall include an inline action. For example: "Track my order" (email + order number → mock tracking timeline), "Start a return" (opens the mock Loop portal link), or "Find my size" (head measurement → size). (interpreted)
- REQ-1098 [unwanted] If the AI has no confident answer, then the card shall say "I'm not sure about that one" with "Chat with us" and the 3 closest articles.
- REQ-1099 [always] Below the answer, "Related articles" shall list matching Guidance articles.

### Quick actions, topics, chat
- REQ-1100 [always] Under the hero, a quick-action grid shall show Where is my order?, Returns & exchanges, Can I cancel / edit my order?, Friday Drops info, Wholesale inquiry, Brand ambassadors & talent and Find my size, as bold mono tiles with icons and arrows. Clicking one runs it as an AI question.
- REQ-1101 [always] An "Explore the help library" section shall show topic cards (from the Guidance categories, plus Authentic Goorin, Cleaning & Care, Payments and Manufacturer Guarantee as needed) with article counts and arrows.
- REQ-1102 [always] A "LET'S TALK IT THROUGH." chat card shall sit beside the library with "AI answers instantly · our crew replies within a day", an "Open chat" button and "Opening chat won't send a message."
- REQ-1103 [always] The existing SupportWidget launcher shall float bottom-right on /help, and "Open chat" / "Continue in chat" open it.
- REQ-1104 [always] A "THIS FRIDAY" band shall show the next drop: "#346 · Way of the Samurai · 10.30.2026", a countdown, a "Join the Club" button and a "Friday Drops FAQ" link. (interpreted, on-brand touch)

### Topic and article pages
- REQ-1105 [always] /help/topic/:slug shall list that topic's articles (title, one-line excerpt, read time) with a topic-scoped AI search bar.
- REQ-1106 [always] /help/article/:id shall show a breadcrumb, a big title, "Updated <date>", the markdown body (Inter, comfortable measure), a table of contents on wide screens, "Was this helpful?", related articles, and an "Ask about this article" mini AI box.

### Footer and responsive
- REQ-1107 [always] The footer shall be dark ink with SITEMAP / SUPPORT / DISCOVER link columns, a "SIGN UP FOR EXCLUSIVE UPDATES" email field, a language and currency selector, and a giant full-width GOORIN wordmark.
- REQ-1108 [state] While on a phone, the hero search shall stay prominent, the grids become 1 column, and the chat launcher stays reachable without covering the search.
- REQ-1109 [always] Admins shall be able to open the Help Center from Guidance ("View help center ↗") and Channels ("Help center ↗").

## Quality
```
Q-881  Tag: Help.Look
       Scale: user judgement "modern, innovative, on-brand Goorin"
       Meter: human review of shots (home 1440, answer 1440, article 1440, phone)
       Must: matches goorin.com brand cues
       Plan: user approves
```
