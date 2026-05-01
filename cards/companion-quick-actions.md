---
id: companion-quick-actions
title: Feed, Pet, and Recall actions
status: backlog
owner: ada
collaborators: []
due: null
created: 2026-04-30
tags: [kitsune-companion, 7dtd, ui, xui, gameplay]
blocked_by: [companion-inventory-sidebar]
---

Three action buttons on the inventory companion sidebar:

- **Feed** — consume a food item from player inventory; grant +bond + heal kitsune. Probably opens a small picker for which food to offer.
- **Pet** — instant +1–2 bond, no item cost, ~5min cooldown. Play a small animation if available.
- **Recall** — teleport kitsune to player on demand, regardless of distance. Bypasses the auto-follow distance threshold.

Each is a button-press → C# method invocation. Cooldowns tracked in CompanionTicker per-kitsune.

- [ ] Wire button handlers in XUi controller for the inventory sidebar
- [ ] Implement `Feed(food)`: consume item, +bond, heal kitsune
- [ ] Implement `Pet()`: instant bond grant, cooldown
- [ ] Implement `Recall()`: teleport using existing UpdateFollow logic
- [ ] Cooldown state stored per-kitsune (cvar or in-memory)
- [ ] Localization strings for button labels + tooltips
- [ ] Tests for cooldown logic (pure)
