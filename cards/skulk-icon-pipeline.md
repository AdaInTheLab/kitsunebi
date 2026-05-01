---
id: skulk-icon-pipeline
title: Icon batch pipeline (master prompt + Pillow + contact sheet)
status: backlog
owner: ada
collaborators: []
due: null
created: 2026-04-30
tags: [skulk, design, infra, icons]
blocked_by: []
---

Cross-mod icon generation pipeline. Hand-editing 200 tiny PNGs across all the Kitsune-Den mods (KitsuneCompanion, KitsuneKitchen, KitsuneFoxacary, future mods) doesn't scale — pipeline does.

**The pattern:**

1. **Style board** — pull existing 7DTD vanilla icons as references; group by category (metal / cloth / food / medical / resource / weapon / mystical). Locks visual grammar before generation.

2. **Master prompt + concept slot** — one consistent prompt template, swap only the item name/concept per generation. Example template:

   > 160x160 game inventory item icon, inspired by gritty post-apocalyptic survival crafting UI icons, centered object, dark transparent background, strong readable silhouette, worn realistic materials, subtle rim light, soft shadow, muted colors, slight grunge texture, no text, no border, no UI frame, high contrast, inventory icon style
   >
   > Item: `<name>` — `<concept>`

3. **Generate big, downscale.** Generate at 512×512 or 1024×1024, then resize to 160×160. AI-gen at 160 directly always comes out mush. Tiny goblin law.

4. **Pillow batch cleanup** — script does crop/center, resize to 160, convert to RGBA, enforce filename, optionally add consistent shadow/glow. Pillow is already in the toolchain from KitsuneCompanion's recolor work.

5. **Contact sheet review.** Render all icons together at small size to catch scale/color drift instantly. Mismatches that hide one-at-a-time jump out side-by-side.

**Tool slots:**
- Pillow / NumPy → batch crop/resize/cleanup (canonical)
- ImageMagick → fallback batch tool
- ComfyUI / SD → for big-volume runs with style consistency
- Photopea / Photoshop → manual polish on the final 160×160s

- [ ] Build vanilla style board (extract reference set from 7DTD bundles)
- [ ] Write master prompt template with concept-slot syntax
- [ ] Pillow batch script: crop/center/resize/RGBA/rename
- [ ] Contact-sheet renderer (script that lays N icons in a grid PNG for review)
- [ ] Pilot run on KitsuneCompanion's 6 existing icons to validate pipeline
- [ ] Document the workflow as a recipe so any agent (or future-ada) can run it cold
