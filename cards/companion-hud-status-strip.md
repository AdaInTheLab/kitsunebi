---
id: companion-hud-status-strip
title: In-game HUD kitsune status strip
status: done
owner: ada
collaborators: []
due: null
created: 2026-04-30
tags: [kitsune-companion, 7dtd, ui, xui]
blocked_by: []
---

Compact always-visible HUD widget showing the player's nearest kitsune: small fox icon + 8-segment bond bar + tier name + temperament name + paw icon. Bottom-left of in-game HUD beside health/stamina.

**Recommended Phase 1** of the full UI integration. Smallest surface, highest visibility (visible 100% of playtime), zero new gameplay systems — pure display of data CompanionTicker already tracks. Validates the XUi modding workflow on a low-risk surface before committing to bigger panels.

Mockup: see the inset in the shrine UI mockup at bottom-left ("KITSUNE STATUS STRIP — Compact bond and temperament display during gameplay").

- [x] XPath append into 7DTD's in-game HUD XML — sibling window to `HUDLeftStatBars`, anchored LeftBottom, registered in toolbelt window_group
- [x] `XUiC_KitsuneStatusStrip` controller — extends XUiController, exposes `kitsuneName` / `kitsuneStatus` / `kitsuneVisible` bindings
- [x] Local-player nearest-kitsune lookup (80m search radius, matches heavy-tick FollowMaxRange)
- [x] Live refresh: `RefreshBindingsSelfAndChildren()` + `SetAllChildrenDirty(true)` on 0.5s cadence in `Update()`
- [ ] Test visibility + positioning across 1080p / 1440p / 4K / ultrawide (deferred polish)
- [ ] Toggle visibility config (deferred polish)

**Shipped 2026-05-01** — commits across `f156dbc` (Phase 2 skeleton) → `301ebfb` (xui.xml registration) → `adb1c79` (Phase 3 controller) → `eda9c77` (assembly-qualified controller name) → `f9d75df` (FollowMaxRange bump) → `94e3d94` (compute-fresh + dirty-refresh) → `eff3fef` (diag cleanup). On Kitsune-Den/KitsuneCompanion main.

**Notes from the build:**
- V2.6 controller lookup needs assembly-qualified name in XML: `controller="KitsuneCompanion.XUiC_KitsuneStatusStrip, KitsuneCompanion"`. Bare class name fails Type.GetType().
- XUi only re-resolves `{bindings}` when children are marked dirty. Without an Update() that calls SetAllChildrenDirty/RefreshBindingsSelfAndChildren, the widget freezes on its first-resolution values.
- `entityClass` IDs are 32-bit hashes (can be negative) — `<= 0` guards drop valid entities. Use `== 0` for unset check.
- 60m widget search radius needs to match (or be ≤) the heavy-tick range; otherwise widget binds to a kitsune the temperament logic doesn't update.
