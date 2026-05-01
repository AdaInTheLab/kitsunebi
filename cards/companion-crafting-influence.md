---
id: companion-crafting-influence
title: Crafting Influence buff system
status: backlog
owner: ada
collaborators: []
due: null
created: 2026-04-30
tags: [kitsune-companion, 7dtd, gameplay, harmony]
blocked_by: []
---

Player-side buff applied while a kitsune is bonded and the player is at a workstation. Mockup shows: **+15% Craft Speed**, **+10% Quality Chance**, **10% Chance to duplicate final output**.

Numbers should scale with bond tier and/or temperament:
- Curious: quality chance bonus
- Playful: craft speed bonus
- Higher bond tier = larger numbers

The duplicate-output mechanic likely needs Harmony to patch the crafting completion. Speed and quality may be doable via player passive_effects if 7DTD's crafting reads them.

Independent gameplay system — does NOT block the crafting sidebar UI; the sidebar can render placeholder values until this lands.

- [ ] Define `buffKitsuneCraftingInfluence` in buffs.xml
- [ ] Apply/remove via CompanionTicker when player is near workstation + has kitsune
- [ ] Wire +CraftSpeed and +QualityChance via player passive_effects
- [ ] Harmony patch for duplicate-output chance
- [ ] Tier-scaled values: Faint/Familiar/Trusted/Bound/Kindred ladder (depends on `companion-bond-ladder-rename`)
- [ ] Tests for tier × temperament → bonus value
