---
id: companion-hud-status-strip
title: KitsuneCompanion: in-game HUD status strip
status: backlog
owner: ada
collaborators: []
due: null
created: 2026-04-30
tags: [kitsune-companion, 7dtd, ui, xui]
blocked_by: []
---

Compact always-visible HUD widget showing the player's nearest kitsune: small fox icon + 8-segment bond bar + tier name + temperament name + paw icon. Bottom-left of in-game HUD beside health/stamina.

**Recommended Phase 1** of the full UI integration. Smallest surface, highest visibility (visible 100% of playtime), zero new gameplay systems — pure display of data CompanionTicker already tracks. Validates the XUi modding workflow on a low-risk surface before committing to bigger panels.

Mockup: see the inset in the shrine UI mockup at bottom-left ("KITSUNE STATUS STRIP — Compact bond and temperament display during gameplay").

- [ ] XPath append into 7DTD's in-game HUD XML for the strip widget
- [ ] Write `XUiC_KitsuneStatusStrip` controller (extends XUi base, binds bond/temperament/form)
- [ ] Resolve "nearest kitsune to player" data source from CompanionTicker
- [ ] Test visibility + positioning across 1080p / 1440p / 4K / ultrawide
- [ ] Toggle visibility config (some players may want to hide it)
