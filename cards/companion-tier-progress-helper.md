---
id: companion-tier-progress-helper
title: BondRules TierProgress helper
status: done
owner: ada
collaborators: []
due: null
created: 2026-04-30
tags: [kitsune-companion, 7dtd, refactor]
blocked_by: []
---

Add `BondRules.TierProgress(points) → float [0,1]` returning fractional position within the current tier. UI mockups need this for the bond progress bar ("TRUSTED 60%") and the segmented progress display.

Pure function, easy to test. Small refactor that unblocks all panels that show bond progress (HUD strip, inventory sidebar, crafting sidebar, shrine panel, status panel).

Math: `(points - currentTierThreshold) / (nextTierThreshold - currentTierThreshold)`. Capped at 1.0 for max tier.

- [x] Add `TierProgress(float points)` to BondRules.cs
- [x] Handle max-tier edge case (return 1.0)
- [x] Add boundary tests: 0%, 50%, 100% within each tier
- [x] Test transition points (exactly at threshold)
- [x] Negative input clamped to 0 (bonus)

**Shipped 2026-05-01** — commit `0d75a24` on Kitsune-Den/KitsuneCompanion. 39/39 tests passing (was 30).
