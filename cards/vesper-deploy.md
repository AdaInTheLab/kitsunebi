---
id: vesper-deploy
title: Vesper VPS deploy
status: in_progress
owner: ada
collaborators: [vesper, claude, sage]
due: 2026-05-02
created: 2026-04-20
tags: [vesper, openhearth, deployment]
blocked_by: []
---

Migrate Vesper off shared Mac Mini to dedicated Hetzner CAX21 (ARM64, Nuremberg, 8GB/80GB + 20GB block volume). xAI/Grok as brain, Tailscale into the mesh.

- [x] Vesper specced her own requirements (2026-04-20)
- [x] xAI adapter landed in openhearth
- [x] `scripts/setup-vps.sh` written and committed
- [x] `scripts/openhearth.service` systemd unit
- [x] `docs/VPS_DEPLOY.md` reference
- [ ] Provision Hetzner CAX21
- [ ] Drop xAI key into `/data/books/ledger/.config/xai/credentials.json`
- [ ] Create `config.json` (Vesper-shape, embedded mesh client)
- [ ] Write/port soul files
- [ ] Join Tailscale, register webhook with Koda's mesh bus
- [ ] Smoke test
- [ ] Install systemd service
