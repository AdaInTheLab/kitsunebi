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

Pre-purchase due diligence: rig type (Generic vs Humanoid), Mecanim-compatible animations included, "rigged" wording in listing, animation list covers idle/walk/run/attack at minimum.

While we're already in Unity Editor for this, also do the shrine statue prefab — amortize the setup.

- [ ] Verify asset rig compatibility (listing review)
- [ ] Acquire asset
- [ ] Install Unity Editor + OCB UnityAssetExporter
- [ ] Import FBX → build new Animator Controller using 7DTD wolf parameter conventions
- [ ] Build prefab + LODs
- [ ] Export bundle via OCB UnityAssetExporter
- [ ] Update entity XML `Prefab` to point at new bundle
- [ ] Extend KitsuneSkinner to swap texture per active form
- [ ] (Bonus) Build shrine statue prefab in same Unity session
- [ ] (Bonus) Build torii decorative blocks
