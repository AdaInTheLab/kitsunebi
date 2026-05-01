---
id: companion-bond-ladder-rename
title: KitsuneCompanion: rename bond ladder 4 → 5 tiers
status: backlog
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

- [ ] Rename constants in BondRules (BuffTrusted/Devoted/Awakened → Familiar/Trusted/Bound/Kindred)
- [ ] Add new `Familiar` tier between Faint(0) and Trusted
- [ ] Redistribute thresholds across 5 levels (current 10/50/200 → new 5/15/50/200 or similar)
- [ ] Rename `buffKitsuneBondTrusted` etc. in buffs.xml; add Familiar buff
- [ ] Update Localization.txt strings
- [ ] Update boundary tests in BondRulesTests
- [ ] Verify all 30 existing tests still pass after rename
