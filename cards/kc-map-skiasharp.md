---
id: kc-map-skiasharp
title: Fix Map view — SkiaSharp native deps on prod
status: backlog
owner: ada
collaborators: [claude]
due: null
created: 2026-04-24
tags: [kitsunecommand, prod, linux, skiasharp]
blocked_by: []
---

Prod panel's Map view is broken — SkiaSharp's static constructor throws on Mono/Linux, breaking map tile rendering. Panel otherwise works fine; only the map-tile pipeline is down.

**Symptom (every boot on Hetzner prod):**
```
[KitsuneCommand] MapTileRenderer initialization failed: The type initializer for 'SkiaSharp.SKData' threw an exception.
EXC The type initializer for 'SkiaSharp.SKData' threw an exception. ---> dl assembly:<unknown assembly>
  at (wrapper managed-to-native) SkiaSharp.LibraryLoader+Linux.dlopen(string,int)
```

Non-fatal — KC init continues, features start, web serves. Just the Map view can't render tiles.

**Already in place:** `ModEntry.cs` registers a Mono DLL map for `libSkiaSharp` and pre-loads `libSkiaSharp.so` from `Mods/KitsuneCommand/linux-x64/`. The preload log line shows `Pre-loaded native library: libSkiaSharp.so` so the file IS loading — but SkiaSharp's static ctor still fails, which smells like a system-dep issue.

**Likely fix:** install SkiaSharp's Linux runtime deps on prod:
```
sudo apt install -y libfontconfig1 libfreetype6
```
If that resolves it, document in `scripts/linux-updater/README.md` alongside the existing `libsqlite3-0` note.

**If still broken:** `ldd /home/ada/7d2d-server/Mods/KitsuneCommand/linux-x64/libSkiaSharp.so` on prod, follow the missing dep. May need to swap the bundled `libSkiaSharp.so` for the with-deps NuGet flavor.

**Test plan:** apt-install the libs → restart → grep log for SkiaSharp EXC (should be gone) → open Map view in the panel, tiles render.
