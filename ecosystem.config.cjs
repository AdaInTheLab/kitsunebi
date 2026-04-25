/**
 * PM2 ecosystem for kitsunebi + its dedicated cloudflared tunnel.
 *
 * Lives at ~/kitsunebi.kitsuneden.net/ecosystem.config.cjs after deploy.
 * The filename matters: PM2 only auto-detects `*.config.{js,cjs}` files
 * as ecosystem configs and parses their `apps:` array. Anything else
 * (e.g. "ecosystem-kitsunebi.cjs") gets run as a plain Node script —
 * which silently no-ops because `module.exports = {…}` doesn't bind any
 * port. Lost an hour to that.
 *
 * Two apps, both managed by the same `pm2 start ecosystem.config.cjs`:
 *
 *   1. `kitsunebi` — the Astro Node-adapter standalone server. Reads
 *      cards/*.md and public/attachments/** at request time, mutates
 *      them via the API routes. Bound to localhost:8002.
 *
 *   2. `cf-tunnel-kitsunebi` — a dedicated Cloudflare Tunnel runner that
 *      brings traffic from kitsunebi.kitsuneden.net in to localhost:8002.
 *      Tunnel ingress (the `kitsunebi.kitsuneden.net → localhost:8002`
 *      mapping) is configured in the Cloudflare dashboard for this
 *      tunnel, NOT in any local config file — that's why this is a
 *      separate tunnel from lab-api's (which uses ~/.cloudflared/config.yml).
 *
 *      The tunnel TOKEN is read from a sibling file on disk (mode 600),
 *      NOT inlined here, so this file stays safe to commit to the public
 *      kitsunebi repo. Provision the token once via the README walk-
 *      through; deploys after that are purely code.
 */

const fs = require('fs');
const path = require('path');

const tunnelTokenPath = path.join(process.env.HOME, '.cloudflared', 'kitsunebi-tunnel-token.txt');
let tunnelToken = '';
try {
  tunnelToken = fs.readFileSync(tunnelTokenPath, 'utf8').trim();
} catch {
  // First-deploy / fresh-VPS case: the token file doesn't exist yet. PM2
  // will still start the kitsunebi app fine; the tunnel app will exit
  // and PM2 will restart-loop until the file is provisioned. Surface the
  // path clearly so the operator knows where to look.
  console.error(
    `[kitsunebi/ecosystem] tunnel token not found at ${tunnelTokenPath}. ` +
    `The cf-tunnel-kitsunebi app will fail to start until you create it. ` +
    `See README.md "Deployment".`
  );
}

module.exports = {
  apps: [
    {
      name: 'kitsunebi',
      script: 'dist/server/entry.mjs',
      cwd: '/home/humanpatternlab/kitsunebi.kitsuneden.net',

      // Match the Node version lab-api uses so PM2 doesn't fall back to
      // the box's system Node 12.
      interpreter: '/home/humanpatternlab/.nvm/versions/node/v20.19.6/bin/node',

      exec_mode: 'fork',
      time: true,

      env: {
        NODE_ENV: 'production',

        // Bound to localhost only; cloudflared brings traffic in from the
        // public hostname. Picked 8002 to sit alongside lab-api on 8001.
        HOST: '127.0.0.1',
        PORT: '8002',

        // Set to "off" to disable the auto-commit-and-push loop. Useful
        // if you want to test mutations without filling git history.
        // Leave unset (or any other value) to enable.
        // KITSUNEBI_GIT_SYNC: 'off',
      },

      max_restarts: 10,
      restart_delay: 2000,

      out_file: '/home/humanpatternlab/kitsunebi.kitsuneden.net/logs/kitsunebi.out.log',
      error_file: '/home/humanpatternlab/kitsunebi.kitsuneden.net/logs/kitsunebi.err.log',
      merge_logs: true,
    },

    {
      name: 'cf-tunnel-kitsunebi',
      script: '/home/humanpatternlab/bin/cloudflared',
      exec_mode: 'fork',
      time: true,

      // IMPORTANT arg ordering: cloudflared uses Go's CLI library where
      // `--no-autoupdate` is a *tunnel command* option (must go between
      // `tunnel` and `run`), NOT a *subcommand* option. Most online
      // examples — and the existing lab-api ecosystem — put it after
      // `run`, which makes cloudflared print its help text and exit
      // with "flag provided but not defined". We just omit it; auto-
      // update is fine in practice.
      args: ['tunnel', 'run', '--token', tunnelToken],

      autorestart: true,
      max_restarts: 20,
      restart_delay: 3000,

      out_file: '/home/humanpatternlab/kitsunebi.kitsuneden.net/logs/cf-tunnel-kitsunebi.out.log',
      error_file: '/home/humanpatternlab/kitsunebi.kitsuneden.net/logs/cf-tunnel-kitsunebi.err.log',
      merge_logs: true,
    },
  ],
};
