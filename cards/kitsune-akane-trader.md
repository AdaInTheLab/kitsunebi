---
id: kitsune-akane-trader
title: Akane — kitsune trader NPC with quests and shrine integration
status: backlog
owner: ada
collaborators: []
due: null
created: 2026-05-01
tags: [7dtd, mod, npc, trader, lore, kitsune-companion]
blocked_by: []
---

Add a custom kitsune trader NPC to 7DTD, Darkness Falls–style. Candidate asset: **Kitsune Akane** ("Game Ready Character" marketplace pack — rigged, anime-style, fox-ears + nine-tails, kimono, katana on belt).

She's not just window dressing — she's the **lorekeeper and connective tissue** that makes KitsuneCompanion narratively coherent. Currently the companion mod is mechanically self-contained but unframed (why does the kitsune exist? where do ritual items come from? who taught me?). Akane answers all of that.

**Cross-pollination with KitsuneCompanion:**

- **Ritual ingredient merchant.** Sells Spirit Ember / Moonlit Resin / Foxfire Shard / Dreaming Silk. Players can grind OR buy. Solves the early-game ritual gating problem we left as placeholder.
- **Talisman vendor.** Sells Mist / Ember / Grove / Storm talismans, gated behind quest progression. Now there's a *reason* to do her quests.
- **Quest-giver for bond progression.** "Bring me a kitsune you've raised to Bound tier and I'll teach you the next ritual." Closes the loop between her and the companion system.
- **Source of the shrine schematic.** First quest reward instead of the current workbench recipe.

**Asset due diligence (resolved 2026-05-01):**

- [x] **Render pipeline:** Built-in compatible. ✅ URP/HDRP not compatible — fine, 7DTD is Built-in.
- [x] **Rig:** Epic Skeleton (UE5). ⚠ Not Mecanim Humanoid out of the box — needs one-time "Configure Avatar" pass in Unity Editor to map UE5 bones (`pelvis`, `spine_01`, `clavicle_l`, etc.) to Mecanim Humanoid slots. ~30 min, well-documented workflow.
- [x] **Blendshapes:** included — facial morphs for expressions / talking animations.
- [x] **Animations:** NOT included. Folder tree shows Mesh / Prefab / Materials / Shaders / Stand / Textures — no Anims folder. Mesh+rig only.
- [ ] **License:** confirm game distribution permitted (check Asset Quality / Publisher tabs).

**Animation plan (asset has no anims):**
1. **Mixamo (free, recommended).** Once she's configured as Humanoid in Unity, upload to Mixamo, retarget their idle/walk/talk/gesture/sword library. ~1 hour to grab a curated set.
2. **Retarget 7DTD vanilla Humanoid clips** — Mecanim can play wolf/zombie Humanoid anims on her once Humanoid avatar is configured. Cheap fallback, limited variety.
3. **Paid animation pack** — last resort.

**Implementation slices:**

1. **Asset import + Unity Editor pass** (~2.5 days). Import FBX, configure Avatar as Humanoid (Epic Skeleton bone-map step), set up materials, validate. Use OCB UnityAssetExporter to bundle.
1b. **Animation sourcing** (~half day). Mixamo curated set: idle, walk, run, talk-gesture, dismissive-wave, sword-draw, sword-swing. Retarget onto Akane's Humanoid avatar.
2. **NPC definition** (~half day). `npc.xml` entry: `id="traderakane"`, `faction="whiteriver"`, custom portrait, `voice_set` (custom or borrowed).
3. **Dialog tree** (~3 days). `dialogs.xml` entries for greeting / sales / quest offers / quest completes / banter. LLM-generate corpus, human-review filter (same Qwen-pipeline pattern from `kitsune-rekt-jokes`).
4. **Quest line** (~3-5 days). 5 starter quests in `quests.xml`:
   - "First Spark" — gather ritual ingredients, unlock the shrine
   - "Faint to Familiar" — bond with a kitsune
   - "First Form" — perform a Mist ritual
   - "Trusted" — reach the Trusted bond tier
   - "Awakened" / "Kindred" — ultimate bond, unlocks lategame Akane content
5. **Trader inventory** (~half day). `traders.xml` entry — kitsune-themed stock, tier-scaled.
6. **Voice acting** (~1 day with AI gen). ElevenLabs or similar, voice direction = warm/wry/wise. Per-line clips referenced in the dialog tree.
7. **POI / placement** (~2-5 days, optional). Custom shrine-grove POI where Akane stands. OR she replaces an existing trader slot. Easier path = slot-replace.
8. **Combat capability** (~1-2 days, optional). The katana detail — she draws and fights bandits/zombies who get too close. AI tasks similar to wolf companion behavior.

**Total honest estimate:** 3.5–5 weeks for the full vision (was 3–5; +half-day Avatar configure, +half-day Mixamo retarget); 1.5–2 weeks for an MVP (NPC + 3 quests + shop, no custom POI, no combat).

**Working repo names:** KitsuneAkane, KitsuneEmissary, KitsuneShrinekeeper, Inari (after the kami of foxes — note Inari is also a kitsune name in `KitsuneNames.cs`, so might collide).

**Why this matters:** standalone, KitsuneCompanion is a mechanically-rich sandbox. With Akane, it becomes a *story*. Every Kitsune-Den fan asks "why is the fox here?" — Akane is the answer.
