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

Third gameplay axis (beyond temperament and form): perks unlocked by bond tier. Three perks, one unlock per tier above Familiar. Orthogonal to form and temperament — they layer.

**Resolved spec (2026-05-01):**

### Resource Sense — *the kitsune leads you to the better stuff*

- Player-side aura while kitsune within **8 blocks**.
- `+10% LootStage` (shifts loot quality tier upward — vanilla V2.6 modifier, real).
- `+5% LootQuantity` (small bonus drop count — also real).
- Synergizes with **Curious** temperament (mood + loot = found-stuff vibe).

### Night Prowl — *the kitsune is in their element at night*

- Player-side aura while kitsune within 8 blocks AND it's nighttime (`!world.IsDaytime()`).
- `+0.20 CrouchSpeed` and `-0.20 EnemySearchDuration` — same modifiers as the Mist aura.
- Stacks deliberately with Mist Form: bonded + Mist + night = peak stealth. That's the lore-correct answer (Mist is the kitsune's specialty; night is when the spirit world bleeds closest).
- Synergizes with Mist Form and **Serene** temperament.

### Pack Instinct — *we hunt together*

- Player-side aura while kitsune within **12 blocks** (slightly larger — pack territory).
- `+5% EntityDamage` and `+5% Mobility` (movement speed).
- Steady-state, not a combat burst — "you fight better when your spirit's beside you."
- Synergizes with **Protective** temperament.

### Unlock progression

| Tier | Perks active |
|---|---|
| Faint | — |
| Familiar | — |
| Trusted | Resource Sense |
| Bound | Resource Sense + Night Prowl |
| Kindred | Resource Sense + Night Prowl + Pack Instinct |

Order rationale:
- Resource Sense first — universally useful, helps progression broadly
- Night Prowl mid — matters once player does risky night ops / late POI clears
- Pack Instinct last — combat synergy as the endgame bond payoff

### Synergy diagram (the dream)

A Mist-bonded Kindred kitsune in Curious mood at night surfaces:
- Mist aura on player (stealth)
- Curious aura on player (XP gain)
- Resource Sense aura (loot quality + quantity)
- Night Prowl aura (stealth, stacks with Mist)
- Pack Instinct aura (damage + mobility)

All five auras active simultaneously. Layered systems that read as "the more you bond, the more your companion shapes your experience." The orthogonality is the design.

### Implementation slices

- [ ] Define `buffKitsuneResourceSense` / `buffKitsuneNightProwl` / `buffKitsunePackInstinct` as marker buffs on the kitsune in `buffs.xml` (selfAOE source pattern, matches existing temperament auras)
- [ ] Define corresponding player-side aura buffs (`*Aura` suffix) with the actual passive_effects
- [ ] Night Prowl needs a `<requirement>` time-of-day gate on its AOE trigger (or in C# before applying)
- [ ] `BondRules.PerksForTier(int tier) → string[]` pure helper returning which perk buffs should be active at each tier
- [ ] CompanionTicker: after `ApplyBondTier`, call `ApplyPerks(kitsune, tier)` — adds markers up to current tier, removes any above
- [ ] Localization strings (3 perk names + descriptions × 2 = 6 entries)
- [ ] Tests for `PerksForTier` (pure)
- [ ] In-game spawn-test verifying all five auras stack visibly when conditions are met

### Cross-references

- `companion-bond-ladder-rename` — depends on Familiar/Trusted/Bound/Kindred names being final ✅ (shipped)
- `companion-tier-progress-helper` — UI display of perks on the status panel needs tier progress ✅ (shipped)
- `companion-spirit-anchored-state` — perk state should follow the player too (whatever spirit-anchor lookup applies for bond should also drive perks)
- `companion-status-panel` and `companion-inventory-sidebar` — display the active perk list per the mockups
