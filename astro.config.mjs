// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// We're hosted on a DreamHost VPS behind a Cloudflare Tunnel, not Vercel.
// `output: 'server'` means every request re-reads the markdown from disk ~
// which is exactly what we want, because the API routes mutate cards on
// disk and we don't want stale snapshots after a drag-and-drop.
//
// The Astro Node adapter spins up a tiny HTTP server (binds to HOST/PORT,
// default 0.0.0.0:4321) that PM2 manages. See ecosystem.config.cjs and
// the README's Deployment section for the full deploy story.
export default defineConfig({
  site: 'https://kitsunebi.kitsuneden.net',
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),

  // Disable Astro's built-in same-origin enforcement on POST/PUT/PATCH/DELETE
  // (default: true since Astro 5). Behind cloudflared the host header it
  // compares against doesn't always equal the public Origin's host, so the
  // check rejects legitimate same-origin drag-drops with
  //   "HTTP 403: Cross-site POST form submissions are forbidden"
  //
  // We're not unprotected: src/lib/api-helpers.ts has our own
  // requireSameOrigin() that's tighter (an explicit allowlist of
  // kitsunebi.kitsuneden.net + localhost dev origins) and runs before
  // every API route's body. CSRF coverage stays.
  security: {
    checkOrigin: false,
  },

  vite: {
    ssr: {
      // Astro's Node standalone adapter doesn't bundle dependencies by
      // default ~ it imports them from node_modules at runtime. Our
      // deploy only rsyncs dist/ and ecosystem.config.cjs (no node_modules,
      // no npm install on the VPS), which means new deps silently crash
      // the running app at request time with ERR_MODULE_NOT_FOUND.
      //
      // Force-bundling here keeps that deploy pattern intact: the dep
      // ends up in dist/ and the VPS never has to know about it. Add
      // any future runtime-only dep to this list.
      noExternal: ['marked'],
    },
  },
});
