---
id: companion-perks-system
title: Companion Perks system
status: backlog
owner: ada
collaborators: []
due: null
created: 2026-04-30
tags: [kitsune-companion, 7dtd, gameplay, design]
blocked_by: []
---

Third gameplay axis (beyond temperament and form): perks unlocked by bond tier. Mockup names three:

- **Resource Sense** — better loot drops near the kitsune? (needs spec — passive bonus to loot tier? scan radius for buried supplies?)
- **Night Prowl** — stealth aura at night? (overlaps with Mist form — must distinguish)
- **Pack Instinct** — group combat assist when player is fighting? (kitsune attacks player's target preferentially? +damage when both engaged?)

**Spec the mechanics before building.** The mockup gives names but not behaviors. Each perk needs a clear, testable definition: trigger condition, effect magnitude, duration, exclusivity rules.

Likely unlock thresholds: Trusted = 1 perk, Bound = 2 perks, Kindred = all 3.

- [ ] Spec Resource Sense mechanic (open question)
- [ ] Spec Night Prowl mechanic (avoid Mist form overlap)
- [ ] Spec Pack Instinct mechanic
- [ ] Define unlock progression by bond tier
- [ ] Implement each as a separate buff in buffs.xml
- [ ] CompanionTicker applies/removes perk buffs on tier transitions
- [ ] Tests per-perk + per-tier mapping
