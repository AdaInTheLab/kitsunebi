---
id: kitsune-stack-sizes
title: 30k stacks for mats, reasonable for everything else
status: backlog
owner: ada
collaborators: []
due: null
created: 2026-04-30
tags: [7dtd, qol, stacks]
blocked_by: []
---

Standalone QoL mod (probable name: KitsuneStacks). Vanilla 7DTD's `Stacknumber` values are wildly inconsistent — some resources stack 6000, some 250, some 50. Pass that normalizes:

- **Mats / resources** → 30k. Wood, stone, iron, scrap, cloth, paper, all the bulk grindables.
- **Everything else** → reasonable scaled values. Not bumped to 30k, but tuned so weapon parts, ammo, food, medical stack to inventory-friendly numbers without trivializing inventory management.

**Approach:** XML-only modlet, XPath set on `Stacknumber` for each item class. No Harmony needed — pure config tune.

**Open spec questions before building:**

- "Reasonable" for non-mats: probably tier-based. Ammo: 1k. Food: 100. Medical: 50. Weapons: 1 (already). Need to walk items.xml and bucket.
- Do crafting outputs (forged iron, glue, duct tape) count as mats (30k) or as crafted goods (lower)? Probably mats.
- Ammo specifically — 1k feels right for a survival pace; some players want unlimited. Maybe a config toggle.

- [ ] Audit vanilla items.xml — bucket every item into mats / ammo / food / medical / tools / weapons / misc
- [ ] Pick reasonable cap per bucket
- [ ] Write XPath set/append modlet
- [ ] Decide on standalone repo (KitsuneStacks) vs folding into existing QoL mod
- [ ] Test that 30k mats don't break trader economy (EconomicValue scaling check)
