---
id: companion-fox-mesh
title: Custom fox mesh via Unity Editor
status: backlog
owner: ada
collaborators: []
due: null
created: 2026-04-30
tags: [kitsune-companion, 7dtd, asset, unity]
blocked_by: []
---

Replace the coyote-derived kitsune mesh with a real fox mesh. Currently the kitsune extends `animalCoyote` and uses a per-instance HSV-tinted body texture as a stand-in. Want a proper fox silhouette: shorter legs, longer snout, fluffier tail.

**One mesh + per-form textures architecture.** If the chosen asset ships red + arctic variants of the same mesh, all four evolution forms come from one mesh asset:
- Base / Manifested → red fox texture
- Mist → arctic fox texture
- Ember → red with fire-glow tinted variant
- Grove → red tinted earthy/mossy
- Storm → arctic tinted stormy blue-grey

Pipeline (per `bundle-building.md`): Unity Editor + OCB UnityAssetExporter. UnityPy clone-and-modify is a confirmed dead end for new prefab geometry.

**Assets acquired 2026-05-01:**
- ✅ **Red Fox Animated** ($24.99) — base mesh + rigged + animations included. No Mixamo retarget needed.
- ✅ **Arctic Fox** ($24.99) — second variant for Mist form. One-mesh-multiple-textures architecture validated.
- ✅ **Japanese Ancient Stone Fox** ($12) — shrine statue prefabs for the kitsuneShrine block visual upgrade (replaces woodWorkBenchPrefab placeholder).

While we're already in Unity Editor for the foxes, also bundle the shrine statue from Japanese Ancient Stone Fox — amortize the setup.

- [x] Verify asset rig compatibility (listing review)
- [x] Acquire asset
- [ ] Install Unity Editor + OCB UnityAssetExporter
- [ ] Import FBX → build new Animator Controller using 7DTD wolf parameter conventions
- [ ] Build prefab + LODs
- [ ] Export bundle via OCB UnityAssetExporter
- [ ] Update entity XML `Prefab` to point at new bundle
- [ ] Extend KitsuneSkinner to swap texture per active form
- [ ] (Bonus) Build shrine statue prefab in same Unity session
- [ ] (Bonus) Build torii decorative blocks
