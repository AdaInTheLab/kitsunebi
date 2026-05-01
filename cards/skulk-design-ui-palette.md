---
id: skulk-design-ui-palette
title: Unified KitsuneDen UI palette canon
status: done
owner: ada
collaborators: []
due: null
created: 2026-04-30
tags: [skulk, design, canon, ui]
blocked_by: []
---

Canonical color palette for all Kitsune-Den UIs (KitsuneCompanion, KitsuneCommand, KitsuneDen dashboard, kitsunebi itself). Defines strict color ownership: Foxfire = kitsune only, Aqua = water only, Gold = structure only, etc.

**Status: done** — the canon exists. Card serves as a pinned reference any UI card can link back to.

Full spec lives in:
- KitsuneCompanion memory: `reference_kitsune_den_ui_palette.md`
- (Recommended) obsidian vault: `skulk-shared/obsidian-vault/skulk-design/ui-palette.md` for cross-project access

**Quick reference:**

| Function | Hex | Owner |
|---|---|---|
| Foxfire primary | `#6FEAFF` | Kitsune system ONLY |
| Hydration aqua | `#3CD4B2` | Water ONLY |
| Health red | `#BE3C3C` | Health |
| Stamina | `#C8C850` | Stamina |
| Frame gold | `#C8A050` | UI structure (no glow) |

**Resolved 2026-04-30:**

- [x] Temperament tint naming → keep code names. Curious / Protective / Playful / Serene. Aggressive dropped (not a code state).
- [x] Serene tint → `rgba(140,220,180,40)` pale green-teal, evoking the healing/regen mechanic.
- [x] MANIFESTED form label → UI-only fallback for "summoned, no specialization active." Not a code-side buff.

**Still open:**

- [ ] (Optional) Drop spec into obsidian vault `skulk-design/ui-palette.md` for cross-project access.
