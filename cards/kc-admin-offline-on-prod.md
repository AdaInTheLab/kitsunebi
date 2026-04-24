---
id: kc-admin-offline-on-prod
title: Admin user shows offline on prod panel
status: done
owner: ada
collaborators: [claude]
due: null
created: 2026-04-24
completed: 2026-04-24
tags: [kitsunecommand, prod, websocket, cloudflare-tunnel]
blocked_by: []
---

**Resolved in PR #38.** Root cause was Cloudflare's managed WAF having rules against two whole classes of path names: anything containing `ws` (blocks the WebSocket Upgrade at edge) *and* anything containing `socket` (blocks any request including plain HEAD/GET). First attempt renamed `/ws` → `/socket`; handshake succeeded but CF severed the stream mid-frame, producing `WebSocketException: header of a frame cannot be read` errors on repeat and a browser-side "Finished 0 kB" WS. Second attempt renamed to `/kcevents` — KC-specific, descriptive, not on any CF deny-list. Backend (`WebSocketHost`, `EventBroadcaster`), frontend (`useWebSocket.ts`), and prod `/etc/cloudflared/config.yml` all use `/kcevents` now. Lesson captured in new troubleshooting doc — see `kc-troubleshooting-docs`.

Along the way also fixed cloudflared resolving `localhost` to `[::1]` while WebSocketSharp binds `0.0.0.0` — tunnel config now uses `http://127.0.0.1:` explicitly.

---

Logged in as `admin` on `panel.kitsuneden.net`, but the Users / presence view shows `admin` as offline. Works correctly on dev — so it's prod-specific, probably related to the Cloudflare Tunnel front-end that dev doesn't have.

**Likely culprits:**

1. **WebSocket failing through CF Tunnel.** Panel WS path is `/ws` → tunnel → `localhost:8889`. If the connection drops or never opens on prod, presence tracking never hears the "user is here" signal. Check browser devtools → Network → WS on prod; if closed/retrying, tunnel config needs `/ws` keepalive or different ingress shape.

2. **UpdateLastLogin vs "online" definition mismatch.** `WebServerHost.HandleLogin` calls `userRepo.UpdateLastLogin(username)` on auth, but presence might be driven by WS heartbeats, not login recency.

3. **Separate presence tracker tied to WS connect/disconnect.** If WS never connects, presence never registers.

**Fast diagnostic:**
- Browser devtools on prod → WS tab: is `/ws` connected, disconnected, or never opened?
- On prod: `grep "WebSocket connected\|WebSocket disconnected" $(ls -t ~/7d2d-server/output_log__*.txt | head -1)` — rapid connect/disconnect pairs = CF Tunnel idle-killing the socket.

**Where to look:**
- `src/KitsuneCommand/Services/` for a `UserPresenceTracker` / session tracker
- `src/KitsuneCommand/Web/WebSocket/` — connection lifecycle
- `frontend/src/composables/useAppWebSocket.ts` — client-side WS init
- `/etc/cloudflared/config.yml` on prod — verify `/ws` ingress rule

**Test plan:** login as admin on prod → WS connected in devtools → Users view shows admin online; repeat after deliberate CF Tunnel restart, verify reconnection.
