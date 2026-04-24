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

**Resolved in PR #38.** Root cause was Cloudflare's managed WAF: any WebSocket Upgrade on a path starting with `ws` (tested `/ws`, `/wss`, `/wsx`, `/mywebsocket` — all blocked) returns HTTP 400 at the CF edge and never reaches our tunnel. Fix was to rename KC's WebSocket endpoint from `/ws` to `/socket` — boring name, no WAF rule matches it. Backend (`WebSocketHost`, `EventBroadcaster`), frontend (`useWebSocket.ts`), and prod `/etc/cloudflared/config.yml` all updated together. Verified on prod: `/socket` upgrade now reaches origin (`cf-cache-status: DYNAMIC` in response, not WAF-blocked). Story going into the new troubleshooting doc — see `kc-troubleshooting-docs`.

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
