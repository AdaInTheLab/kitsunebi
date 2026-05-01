---
id: companion-spirit-return
title: Kitsune doesn't die — spirit returns, re-manifests at shrine
status: backlog
owner: ada
collaborators: []
due: null
created: 2026-05-01
tags: [kitsune-companion, gameplay, shrine, lore, harmony]
blocked_by: [companion-spirit-anchored-state]
---

The kitsune is fundamentally a **spirit**. Manifestation in physical form is the temporary state — their truest form is the spirit world. When their corporeal body's HP hits zero, they don't die: the spirit returns home. The bond persists because the bond was never with the body, only ever with the spirit.

To call them back, the player performs the same manifestation ritual at a Kitsune Shrine — the one that brought them in the first time. **Same ritual, different beat.** No separate "resurrection recipe." First time = welcoming a new spirit; later times = welcoming back a known one.

**Why this design:**

- Mechanically simpler — no special recovery flow, just reuse manifestation
- Emotionally cleaner — no "death" framing, no "fallen" toast, no grief language
- Lore-coherent with the kitsune-as-spirit-being mythology already implicit in the mod
- Closes the bond persistence gap with elegance instead of bureaucracy

**Behavior on entity destruction:**

- Spirit returns to spirit world (HP-zero handling)
- Notification toast: *"Akari's spirit returns home."* (warm, not grim)
- No state lost — bond points, active form, name all live on the **player**, not the entity (see `companion-spirit-anchored-state`)
- Player can re-manifest at any Kitsune Shrine using the same flow that summoned them initially

**Behavior on re-manifestation:**

- Player at shrine performs the manifestation ritual (existing flow)
- New `kitsuneCompanion` entity spawns, reads player's spirit-anchored state, presents as the same kitsune (same name, same bond, same form)
- Notification toast: *"Akari steps back into the world."*

**Resolved design (2026-05-01):**

- Bond preserved 100% across spirit returns. No loss.
- Same ritual cost as initial manifestation. No scaling. No special "rite."
- Permadeath remains a possible mod-config toggle for hardcore players.

**Implementation slices:**

- [ ] Harmony patch on kitsune entity HP-zero / OnEntityDeath — fires spirit-return toast, ensures graceful entity removal
- [ ] Re-manifestation flow: existing shrine ritual checks player's spirit-anchored state and applies it to the freshly spawned entity
- [ ] Override `KitsuneNames` to use player-anchored stored name on re-manifestation (so the kitsune's identity persists)
- [ ] Toast strings + localization
- [ ] Edge case: player has never bonded a kitsune yet — first manifestation works normally (no carryover, deterministic name from new entityId)
- [ ] Edge case: multiple shrines? The kitsune re-manifests wherever the ritual is performed — shrines are interchangeable spirit-conduits
- [ ] (Stretch) Particle effect on demanifestation: a brief blue-foxfire wisp dispersing upward

**Cross-references:**

- `companion-spirit-anchored-state` — the underlying refactor that makes this work; this card depends on it
- `companion-notification-toasts` — toast event system
- `companion-shrine-offering-panel` — the UI surface where re-manifestation visually happens
