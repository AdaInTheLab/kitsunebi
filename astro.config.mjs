// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// We're hosted on a DreamHost VPS behind a Cloudflare Tunnel, not Vercel.
// `output: 'server'` means every request re-reads the markdown from disk —
// which is exactly what we want, because the API routes mutate cards on
// disk and we don't want stale snapshots after a drag-and-drop.
//
// The Astro Node adapter spins up a tiny HTTP server (binds to HOST/PORT,
// default 0.0.0.0:4321) that PM2 manages. See ecosystem-kitsunebi.cjs
// and docs/deploy.md for the full deploy story.
export default defineConfig({
  site: 'https://kitsunebi.kitsuneden.net',
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
});
