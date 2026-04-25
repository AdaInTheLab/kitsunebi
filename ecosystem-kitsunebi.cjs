/**
 * PM2 ecosystem for kitsunebi on the DreamHost VPS.
 *
 * Lives at ~/kitsunebi.kitsuneden.net/ecosystem-kitsunebi.cjs after deploy.
 * The app is the Astro Node-adapter standalone build at dist/server/entry.mjs
 * (everything bundled — no node_modules needed at runtime).
 *
 * Cloudflared ingress entry that routes the public hostname here lives in
 * ~/.cloudflared/config.yml and is shared with lab-api. See README.md
 * "Deployment" for the one-time setup steps.
 */

module.exports = {
  apps: [
    {
      name: 'kitsunebi',
      // Astro's Node-adapter standalone entry. Bundle is self-contained.
      script: 'dist/server/entry.mjs',
      cwd: '/home/humanpatternlab/kitsunebi.kitsuneden.net',

      // Match the Node version lab-api uses so PM2 doesn't fall back to
      // the box's old system Node 12.
      interpreter: '/home/humanpatternlab/.nvm/versions/node/v20.19.6/bin/node',

      exec_mode: 'fork',
      time: true,

      env: {
        NODE_ENV: 'production',

        // Bound to localhost only; cloudflared brings traffic in from the
        // public hostname. Picked 8002 to sit alongside lab-api on 8001.
        HOST: '127.0.0.1',
        PORT: '8002',

        // Set to "off" to disable the auto-commit-and-push loop. Useful if
        // you want to test mutations without filling git history. Leave
        // unset (or anything else) to enable.
        // KITSUNEBI_GIT_SYNC: 'off',
      },

      max_restarts: 10,
      restart_delay: 2000,

      out_file: '/home/humanpatternlab/kitsunebi.kitsuneden.net/logs/kitsunebi.out.log',
      error_file: '/home/humanpatternlab/kitsunebi.kitsuneden.net/logs/kitsunebi.err.log',
      merge_logs: true,
    },
  ],
};
