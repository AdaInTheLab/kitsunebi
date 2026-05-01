---
id: companion-inventory-sidebar
title: Kitsune inventory screen sidebar
status: backlog
owner: ada
collaborators: []
due: null
created: 2026-04-30
tags: [kitsune-companion, 7dtd, ui, xui]
blocked_by: [companion-tier-progress-helper]
---

Right-side panel on the player's inventory/character screen titled "KITSUNE COMPANION". Shows form, temperament, bond tier + percent (segmented bar), companion perks list. Display-only on this card — interactive Feed/Pet/Recall actions are on `companion-quick-actions`.

Reads from CompanionTicker state for the player's nearest kitsune. Same data sources as the HUD strip but more detail and more screen real estate.

Mockup: second image of the UI integration mockups. Annotations in mockup label sections: "KITSUNE PANEL — Quick view of your companion's status and actions."

- [ ] XPath append into XUi inventory window XML to add the sidebar panel
- [ ] Write `XUiC_KitsuneCompanionPanel` controller binding form/temperament/bond
- [ ] Bond progress segmented bar component (8 segments + percent)
- [ ] Companion perks list (placeholder until `companion-perks-system` lands)
- [ ] Style match: blue glow accents, gold trim, kitsune emblems consistent with mockup
