---
id: companion-resurrection-ritual
title: Resurrection ritual at shrine after kitsune death
status: backlog
owner: ada
collaborators: []
due: null
created: 2026-05-01
tags: [kitsune-companion, gameplay, shrine, harmony, persistence]
blocked_by: []
---

When the kitsune dies in combat, the bond isn't lost — the player returns to a Kitsune Shrine and performs a resurrection rite. A new kitsune entity spawns with the bond, form, and name of the fallen one carried over.

This makes the shrine the **lifecycle anchor** for the kitsune: it's where they're born (current shrine flow), where they evolve (form talismans), and where they return from death. Closes the bond-cvar-dies-with-entity persistence gap currently in the code.

**State to persist across death:**

- **Bond points** — the deepest investment; losing this on death would be devastating
- **Active form** (Mist / Ember / Grove / Storm) — players who chose specialization shouldn't lose it
- **Name** (from `KitsuneNames.GetName(entityId)`) — deterministic from entityId, so a new entity = new name. To preserve continuity, override with a stored name on the resurrected kitsune. Otherwise "Vesper died, Akari returned" feels wrong.

**Storage layer:**

Per-player cvar (probably) or a small custom save-data file in `<modroot>/Data/` or `<saveDir>/kitsune-carryover.json`. Per-player makes multiplayer sense — each player's bond is their own. Schema:

```json
{
  "kitsuneBondPoints": 145.3,
  "kitsuneActiveForm": "buffKitsuneFormMist",
  "kitsuneName": "Vesper"
}
```

**Mechanic shape:**

1. Kitsune dies → Harmony postfix on `EntityAlive.OnEntityDeath` (or wherever death finalizes) detects the kitsune class, snapshots its state to the nearest-player's carryover slot, posts notification toast: *"Vesper has fallen. Return to a shrine to call them back."*
2. Player goes to shrine → new recipe `kitsuneResurrectionRite` is visible only when carryover state exists. Costs: maybe 1× of each ritual ingredient + a Bond Charm + something rare like a Spirit Ember×3 (ritual feel of "rebuilding the spirit").
3. Recipe craft completes → C# spawn hook reads carryover, spawns a `kitsuneCompanion` entity at the shrine, applies bond cvar, applies form buff if any, overrides name to stored name. Notification toast: *"Vesper has returned to you."*

**Implementation slices:**

- [ ] Spec the carryover storage (cvar vs JSON file vs SaveData hook)
- [ ] Harmony patch on entity death to capture and store
- [ ] Override mechanism for `KitsuneNames.GetName` so resurrected kitsunes use the stored name instead of the deterministic-hash name (probably an optional override map keyed on entityId)
- [ ] Recipe definition `kitsuneResurrectionRite` + visibility gate (only when carryover exists)
- [ ] Recipe-completion hook → spawn entity at shrine + apply carryover state
- [ ] Notification toasts on death and resurrection (hooks into `companion-notification-toasts` card)
- [ ] Tests: carryover state round-trip (serialize → deserialize) as pure logic
- [ ] Edge case: player has no carryover (never bonded a kitsune yet) → recipe hidden / shows tooltip "no kitsune to call back"
- [ ] Edge case: multiple players, one kitsune — whose carryover saves on death? (Probably the highest-bond player. Or the closest player at time of death.)

**Open design questions:**

- Should the resurrected kitsune lose any bond on death, or carry over 100%? Tradeoff: 100% = no penalty for combat losses; some-loss = death matters but isn't punitive. Suggest: lose ~10% bond on death to make combat positioning meaningful without being cruel.
- Should the resurrection cost scale with bond tier? Higher-tier bond = more spiritual "weight" to recall. Cost scaling adds dramatic stakes for endgame.
- Should there be a "permanent death" option toggleable in mod config? Hardcore players would want it.

**Cross-references:**

- `companion-notification-toasts` — death/resurrection events fire toasts via that system
- `companion-shrine-offering-panel` — the resurrection recipe lives in this UI when it ships
- `kitsune-akane-trader` — Akane could SELL the resurrection-rite ingredients OR be the questgiver who teaches the rite at first death
