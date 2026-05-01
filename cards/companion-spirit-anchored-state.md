---
id: companion-spirit-anchored-state
title: Move bond, form, and name from kitsune entity to player anchor
status: backlog
owner: ada
collaborators: []
due: null
created: 2026-05-01
tags: [kitsune-companion, refactor, persistence]
blocked_by: []
---

Foundational refactor needed for `companion-spirit-return` and any other feature that wants kitsune identity to persist across entity destruction.

**The problem:** today bond points, active form buff, and name are all stored on the **kitsune entity**:

- Bond points → cvar on `kitsune.Buffs` (`kitsuneBondPoints`)
- Active form → buff on `kitsune.Buffs` (`buffKitsuneFormMist` etc.)
- Name → deterministic hash of `kitsune.entityId` (`KitsuneNames.GetName`)

When the entity is destroyed (HP zero, world unload, despawn), all three are gone. That's incompatible with the spirit-world lore: the spirit IS the bond, IS the chosen form, IS the name. The body is the temporary container.

**The fix:** anchor state on the **player** instead, so it persists across kitsune lifecycle independent of any specific entity.

- Bond points → player cvar `kitsuneBondPoints`
- Active form → player cvar (string-encoded) or per-player flag set (`kitsuneFormMist=1` etc.)
- Name → stored on player when first generated, used by all subsequent manifestations

The kitsune entity becomes a **window** that reads from the player. CompanionTicker:

- On tick, find each player → read their spirit-anchored state → ensure their manifested kitsune (if any) reflects it
- On talisman/charm consumption, write to player state, NOT entity state
- On entity manifestation (shrine ritual), spawn entity and apply player state to it

**Affected files:**

- `Source/BondRules.cs` — `CvarBondPoints` keyed on player not kitsune. Comment update.
- `Source/CompanionTicker.cs` — `GetBondPoints` / `AddBondPoints` / `ApplyBondTier` / `ApplyForm` / talisman + charm consumption flows all swap from `kitsune.Buffs.*` to `player.Buffs.*`
- `Source/KitsuneNames.cs` — gain an override map keyed on player entityId (or get the player's stored name); fall back to deterministic hash when nothing's stored
- `Source/CompanionTicker.cs` — manifestation hook: when kitsune spawns, copy player state into entity for the buff system to render correctly (bond tier buff on the kitsune, form buff on the kitsune)

**Open questions:**

- Multiplayer: each player has their own kitsune. State is naturally per-player so MP just works.
- What if a kitsune is killed, but the player isn't near a shrine for a long time? State stays on the player indefinitely. No expiry. Coming back from a long break still finds your kitsune waiting.
- Save data: player cvars persist with the player save automatically — no custom save layer needed.

**Tests:**

- Pure logic for player-keyed state lookup remains testable (similar shape to existing tests). Game-runtime integration still needs in-game spawn-test.

**Why now:**

Without this refactor, `companion-spirit-return` either has to do messy "save state on death, restore on respawn" carryover (my original design before the spirit-world framing landed), or it can't preserve identity across entity lifecycle at all. With this refactor, spirit return is trivial — just spawn a new entity that reads from the unchanged player state.

This is the kind of refactor that's painful to do later (after lots of code depends on entity-keyed state) and easy to do now (small surface area). Worth doing before any of the UI cards land — they'll all read from the same state layer.
