/**
 * Mesh-webhook notifications.
 *
 * After each kitsunebi write, fire-and-forget a notification to every
 * agent who owns or collaborates on the card (minus the one who made
 * the change ~ no self-pings). The notification flows via the Skulk's
 * mesh bus (an HTTP endpoint exposing POST /message), which fans out
 * to whatever each agent has registered.
 *
 * Configuration:
 *
 *   KITSUNEBI_MESH_URL=http://...    base URL of the mesh server's
 *                                    /message endpoint. Required;
 *                                    when unset, this module is a
 *                                    no-op so the API works fine on
 *                                    boxes without mesh connectivity.
 *
 *   KITSUNEBI_PUBLIC_URL=https://kitsunebi.kitsuneden.net
 *                                    used to build the link included
 *                                    in each notification. Defaults
 *                                    to the public hostname.
 *
 * Failure mode: best-effort. Network errors, 4xx, 5xx ~ all logged
 * and swallowed. The kitsunebi write already succeeded; a failed
 * notification shouldn't roll it back.
 */

import { readCard } from './cards-fs';

const DEFAULT_PUBLIC_URL = 'https://kitsunebi.kitsuneden.net';

export type CardEvent =
  | { type: 'create'; title: string }
  | { type: 'move'; toStatus: string; title: string }
  | { type: 'patch'; fields: string[]; title: string }
  | { type: 'attach'; filename: string; title: string }
  | { type: 'detach'; filename: string; title: string }
  | { type: 'comment'; preview: string; title: string };

interface NotifyOpts {
  cardId: string;
  /** Agent who performed the action; skipped from recipients. null for browser writes. */
  actor: string | null;
  event: CardEvent;
}

const meshUrl = (): string | null => {
  const raw = process.env.KITSUNEBI_MESH_URL;
  if (!raw || !raw.trim()) return null;
  return raw.trim().replace(/\/$/, '');
};

const publicUrl = (): string =>
  (process.env.KITSUNEBI_PUBLIC_URL ?? DEFAULT_PUBLIC_URL).replace(/\/$/, '');

const cardLink = (cardId: string): string => `${publicUrl()}/cards/${encodeURIComponent(cardId)}/`;

const formatText = (cardId: string, ev: CardEvent): string => {
  const link = cardLink(cardId);
  switch (ev.type) {
    case 'create':
      return `created "${ev.title}" ~ ${link}`;
    case 'move':
      return `moved "${ev.title}" to ${ev.toStatus} ~ ${link}`;
    case 'patch':
      return `patched "${ev.title}" (${ev.fields.join(', ')}) ~ ${link}`;
    case 'attach':
      return `attached ${ev.filename} to "${ev.title}" ~ ${link}`;
    case 'detach':
      return `removed ${ev.filename} from "${ev.title}" ~ ${link}`;
    case 'comment':
      return `commented on "${ev.title}": ${ev.preview} ~ ${link}`;
  }
};

/**
 * Resolve recipients: card.owner + card.collaborators, minus the actor
 * (no self-pings). Falls back to the empty set if the card can't be read.
 */
async function recipients(cardId: string, actor: string | null): Promise<string[]> {
  let card;
  try {
    card = await readCard(cardId);
  } catch {
    return [];
  }
  const owner = card.frontmatter.owner;
  const collabs = card.frontmatter.collaborators ?? [];
  const all = new Set<string>();
  if (owner) all.add(owner);
  for (const c of collabs) all.add(c);
  if (actor) all.delete(actor);
  return [...all];
}

/**
 * Fire one POST per recipient. Best-effort: each failure is logged and
 * swallowed. Returns the count actually queued so callers can log it.
 *
 * The mesh `/message` endpoint shape is `{ from, to, text }` ~ the same
 * shape `bash skulk-mesh/scripts/mesh.sh send <from> <to> <text>` uses.
 */
export async function notifyCardChange({ cardId, actor, event }: NotifyOpts): Promise<number> {
  const url = meshUrl();
  if (!url) return 0;
  const targets = await recipients(cardId, actor);
  if (targets.length === 0) return 0;

  const text = formatText(cardId, event);
  const from = actor ?? 'kitsunebi';

  const sends = targets.map(async (to) => {
    try {
      const r = await fetch(`${url}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, text }),
      });
      if (!r.ok) {
        const errText = await r.text().catch(() => '');
        console.error(`[kitsunebi/mesh-notify] ${from} → ${to} failed ${r.status}: ${errText.slice(0, 200)}`);
      }
    } catch (err: any) {
      console.error(`[kitsunebi/mesh-notify] ${from} → ${to} threw:`, err?.message ?? err);
    }
  });
  await Promise.allSettled(sends);
  return targets.length;
}

/**
 * Don't await this from inside an API route's response path. We don't
 * want the response time held hostage by a slow mesh. Fire-and-forget
 * wrapper.
 */
export function notifyCardChangeBackground(opts: NotifyOpts): void {
  void notifyCardChange(opts).catch((err) => {
    console.error('[kitsunebi/mesh-notify] background failure:', err);
  });
}
