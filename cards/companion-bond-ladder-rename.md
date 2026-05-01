---
id: companion-bond-ladder-rename
title: Rename bond ladder 4 to 5 tiers
status: done
owner: ada
collaborators: []
due: null
created: 2026-04-30
tags: [kitsune-companion, 7dtd, refactor]
blocked_by: []
---

Current bond tiers: Novice → Trusted → Devoted → Awakened (4 tiers). UI mockups define a different ladder: **Faint → Familiar → Trusted → Bound → Kindred** (5 tiers). "Trusted" persists as a name but moves from tier 1 to tier 2.

Foundational refactor — blocks every UI panel that surfaces the tier name. Best done before UI work begins so panels and tests land on stable names.

Files: `Source/BondRules.cs`, `KitsuneCompanion/Config/buffs.xml`, `KitsuneCompanion/Config/Localization.txt`, `Tests/BondRulesTests.cs`. Plus add a fifth tier with its own threshold + stat bonus.

Mockup detail: see `project_shrine_ui_design.md` in KitsuneCompanion memory.

- [x] Rename constants in BondRules (BuffTrusted/Devoted/Awakened → Familiar/Trusted/Bound/Kindred)
- [x] Add new `Familiar` tier between Faint(0) and Trusted
- [x] Redistribute thresholds: 5 / 25 / 100 / 300 (Familiar→Kindred)
- [x] Rename `buffKitsuneBondTrusted` etc. in buffs.xml; add Familiar buff
- [x] Update Localization.txt strings
- [x] Update boundary tests in BondRulesTests
- [x] Update TemperamentRulesTests to use new tier names

**Shipped 2026-05-01** — commit `1112983` on Kitsune-Den/KitsuneCompanion. 43/43 tests passing (unchanged count; old tests adapted in place + Familiar tier added to the boundary theory).

Notes:
- "Trusted" name persists but moves from tier 1 → tier 2 in the new ladder.
- TemperamentRules `bondTier >= 2` comparison unchanged — old Devoted (50 pts) and new Trusted (25 pts) land in similar numeric range, so the Playful-flip-at-mid-health timing carries forward.
- Buff bonuses preserved across rename: tiers 2/3/4 keep the old Trusted/Devoted/Awakened effects exactly. Familiar (tier 1) is a new small +5% HealthMax entry-level bonus.
