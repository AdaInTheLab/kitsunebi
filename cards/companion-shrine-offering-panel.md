---
id: companion-shrine-offering-panel
title: Shrine offering panel (custom XUi window)
status: backlog
owner: ada
collaborators: []
due: null
created: 2026-04-30
tags: [kitsune-companion, 7dtd, ui, xui]
blocked_by: [companion-bond-ladder-rename, companion-tier-progress-helper]
---

Replace the vanilla workstation crafting view that opens when you interact with a Kitsune Shrine block. Bespoke XUi window with three regions:

- **Offerings** (left): three ingredient slots (Spirit Ember, Moonlit Resin, Dreaming Silk — no Foxfire Shard) with held/needed counts.
- **Bond Growth** (top right): 5-tier ladder visualization, current bond %, next-tier preview text.
- **Benefits Preview** (bottom right): list of unlocks at next tier.

Single primary action: **MAKE OFFERING** button consumes the ingredients and grants bond points. Replaces (or augments) the current Bond Charm flow.

"View Companion Status" hotkey (R) opens the paired companion status panel.

Mockup: `project_shrine_ui_design.md` in KitsuneCompanion memory — torii-framed, blue accents, gold trim.

- [ ] Change `kitsuneShrine` block from stock Workstation to custom UI window class
- [ ] Custom XUi window XML in `Config/XUi/...`
- [ ] `XUiC_KitsuneShrinePanel` controller
- [ ] Three slot binders showing ingredient held/needed counts
- [ ] 5-tier ladder visualization with current position highlighted
- [ ] Benefits Preview reads next-tier perks
- [ ] MAKE OFFERING button → consume ingredients → +bond
- [ ] R hotkey → open companion status panel
- [ ] Sprite assets: torii corners, candle ornaments, kitsune emblems
