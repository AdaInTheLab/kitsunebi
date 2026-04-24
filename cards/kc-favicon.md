---
id: kc-favicon
title: KitsuneCommand panel favicon
status: backlog
owner: ada
collaborators: [claude]
due: null
created: 2026-04-24
tags: [kitsunecommand, polish, branding]
blocked_by: []
---

Browser tabs for `panel.kitsuneden.net` (and the dev panel) currently show the default Vite icon or a missing favicon. Replace with something on-brand — fox silhouette, orange/fire palette.

**Files to ship:**
- `favicon.ico` (16×16 + 32×32 multi-size) at `frontend/public/favicon.ico`
- `favicon-32x32.png`, `favicon-16x16.png`
- `apple-touch-icon.png` (180×180) for iOS

**Wire-up:** confirm `frontend/index.html` `<link rel="icon">` points at the new file(s). Vite copies `public/` → build output automatically.

**Style reference:** the KitsuneDen dashboard + operator's manual fox imagery already in repo. Reuse, don't reinvent. Dark-theme-friendly at 16×16.

**Test plan:** hard-reload panel in Chrome/Firefox, tab icon shows the fox. Also confirms on iOS pinned-tab.
