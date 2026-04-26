/**
 * POST /api/cards/:id/attachments  (multipart/form-data)
 *   field "file"            — the upload (required)
 *   field "appendToBody"    — "true"|"false" (default "true")
 *
 * Saves the upload to public/attachments/<card-id>/<safe-filename>. When
 * appendToBody is true (the common case for image uploads from the card
 * detail page), also appends `![name](url)` to the card body so the
 * image actually appears without a separate body-editing flow.
 *
 * Filename hygiene:
 *   - reject anything not matching a strict whitelist
 *   - prefix with timestamp when there's a name collision (don't silently overwrite)
 *   - cap at 10 MB so a fat-fingered upload doesn't fill the VPS disk
 */

import type { APIRoute } from 'astro';
import { mkdir, writeFile, access, readFile, unlink } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { json, jsonError, requireSameOrigin } from '../../../../lib/api-helpers';
import { requireAuth } from '../../../../lib/agent-auth';
import { scheduleGitSync } from '../../../../lib/git-sync';
import { notifyCardChangeBackground } from '../../../../lib/mesh-notify';
import { readCard } from '../../../../lib/cards-fs';

const MAX_BYTES = 10 * 1024 * 1024;
const ATTACHMENTS_DIR = join(process.cwd(), 'public', 'attachments');

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const auth = requireAuth(ctx, requireSameOrigin);
  if (auth instanceof Response) return auth;

  const id = ctx.params.id;
  if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,99}$/i.test(id)) {
    return jsonError(400, 'invalid_id', 'Path parameter "id" is missing or unsafe.');
  }

  let formData: FormData;
  try {
    formData = await ctx.request.formData();
  } catch (err: any) {
    return jsonError(400, 'invalid_form', err?.message ?? 'Failed to parse multipart body.');
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return jsonError(400, 'missing_file', 'Expected a "file" field of type file in the multipart body.');
  }

  if (file.size === 0) {
    return jsonError(400, 'empty_file', 'Uploaded file is empty.');
  }
  if (file.size > MAX_BYTES) {
    return jsonError(413, 'file_too_large', `Max upload size is ${MAX_BYTES} bytes (${(MAX_BYTES / 1024 / 1024).toFixed(1)} MB).`);
  }

  const safeName = sanitizeFilename(file.name);
  if (!safeName) {
    return jsonError(400, 'invalid_filename', 'Filename has no allowed characters left after sanitization.');
  }

  const cardDir = join(ATTACHMENTS_DIR, id);
  await mkdir(cardDir, { recursive: true });

  // If the target name already exists, prepend a timestamp prefix instead
  // of overwriting. Cheap collision avoidance; never lose a file.
  let outName = safeName;
  if (await fileExists(join(cardDir, outName))) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').replace(/T/, '_').slice(0, 19);
    outName = `${ts}_${safeName}`;
  }
  const outPath = join(cardDir, outName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(outPath, buffer);

  const url = `/attachments/${id}/${outName}`;
  // Use the on-disk filename (without the timestamp prefix if there was a
  // collision) as alt text — readable and stable across re-renames.
  const altText = outName.replace(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_/, '');
  const markdown = `![${altText}](${url})`;

  // Optionally append the markdown to the card body. Image uploads from the
  // detail page use this so the picture actually appears; pure attachments
  // (linked from elsewhere) opt out by passing appendToBody=false.
  const appendFlag = formData.get('appendToBody');
  const shouldAppend = appendFlag === null || String(appendFlag) === 'true';
  if (shouldAppend) {
    try {
      await appendToCardBody(id, '\n\n' + markdown + '\n');
    } catch (err: any) {
      // The file is already on disk; refuse to silently lose it. Tell the
      // caller the upload succeeded but body-append failed so they can
      // decide what to do.
      return json(207, {
        id,
        filename: outName,
        size: file.size,
        url,
        markdown,
        body_append_failed: err?.message ?? 'unknown error',
      });
    }
  }

  const agentSuffix = auth.agent ? ` (${auth.agent})` : '';
  scheduleGitSync(`attach ${id}/${outName}${shouldAppend ? ' (+ body)' : ''}${agentSuffix}`);

  let title = id;
  try { title = (await readCard(id)).frontmatter.title ?? id; } catch {}
  notifyCardChangeBackground({
    cardId: id,
    actor: auth.agent,
    event: { type: 'attach', filename: outName, title },
  });

  return json(201, {
    id,
    filename: outName,
    size: file.size,
    url,
    markdown,
    appended_to_body: shouldAppend,
  });
};

/**
 * DELETE /api/cards/:id/attachments?file=<basename>
 *
 * Removes the file from public/attachments/<id>/ AND strips the matching
 * `![alt](/attachments/<id>/<file>)` markdown reference from the card body.
 * Used by the ✕ button on board-view thumbnails.
 */
export const DELETE: APIRoute = async (ctx) => {
  const auth = requireAuth(ctx, requireSameOrigin);
  if (auth instanceof Response) return auth;

  const id = ctx.params.id;
  if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,99}$/i.test(id)) {
    return jsonError(400, 'invalid_id', 'Path parameter "id" is missing or unsafe.');
  }

  const filename = new URL(ctx.request.url).searchParams.get('file');
  if (!filename || !/^[a-zA-Z0-9._-]{1,200}$/.test(filename)) {
    return jsonError(400, 'invalid_filename', 'Query parameter "file" is required and must be a safe basename.');
  }

  const cardDir = join(ATTACHMENTS_DIR, id);
  const target = join(cardDir, filename);
  // Defense in depth against `..` shenanigans even though the regex above already blocks them.
  if (!target.startsWith(cardDir + sep)) {
    return jsonError(400, 'path_escape', 'Refusing to operate outside the card attachments directory.');
  }

  try {
    await unlink(target);
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return jsonError(404, 'not_found', `No such attachment: ${filename}`);
    }
    return jsonError(500, 'unlink_failed', err?.message ?? 'Failed to remove file.');
  }

  let bodyReferenceRemoved = false;
  try {
    bodyReferenceRemoved = await removeImageReferenceFromBody(id, `/attachments/${id}/${filename}`);
  } catch (err: any) {
    return json(207, {
      id,
      filename,
      file_removed: true,
      body_strip_failed: err?.message ?? 'unknown error',
    });
  }

  const agentSuffix = auth.agent ? ` (${auth.agent})` : '';
  scheduleGitSync(`detach ${id}/${filename}${bodyReferenceRemoved ? ' (+ body)' : ''}${agentSuffix}`);

  let title = id;
  try { title = (await readCard(id)).frontmatter.title ?? id; } catch {}
  notifyCardChangeBackground({
    cardId: id,
    actor: auth.agent,
    event: { type: 'detach', filename, title },
  });

  return json(200, {
    id,
    filename,
    file_removed: true,
    body_reference_removed: bodyReferenceRemoved,
  });
};

/**
 * Strip every `![alt](url)` line whose URL matches the given attachment path.
 * Returns true if anything was removed. Collapses 3+ resulting blank lines.
 */
async function removeImageReferenceFromBody(id: string, url: string): Promise<boolean> {
  const path = join(process.cwd(), 'cards', `${id}.md`);
  const current = await readFile(path, 'utf8');
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^!\\[[^\\]]*\\]\\(${escaped}\\)\\s*\\r?\\n?`, 'gm');
  const next = current.replace(re, '').replace(/\n{3,}/g, '\n\n');
  if (next === current) return false;
  await writeFile(path, next, 'utf8');
  return true;
}

/** Append text to the body of a card (the part after the closing `---`). */
async function appendToCardBody(id: string, text: string): Promise<void> {
  const path = join(process.cwd(), 'cards', `${id}.md`);
  const current = await readFile(path, 'utf8');
  // Find the end of the closing frontmatter delimiter; everything past it
  // is the body. We append after `text` rather than rewriting in place to
  // preserve trailing whitespace / blank lines exactly.
  const m = current.match(/^---\r?\n[\s\S]*?\n---\r?\n/);
  if (!m) {
    throw new Error('card has no closing frontmatter delimiter');
  }
  const next = current.trimEnd() + text;
  await writeFile(path, next, 'utf8');
}

function sanitizeFilename(name: string): string {
  // Strip any path components, keep only the basename.
  const base = name.replace(/\\/g, '/').split('/').pop() ?? '';
  // Allow letters, digits, dot, dash, underscore. Replace runs of anything else with `-`.
  // Cap length to avoid pathological filenames.
  const clean = base.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
  // Reject pure-dot names ("..", "." etc.) — they'd break path joining and aren't useful.
  if (/^\.+$/.test(clean)) return '';
  return clean;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}
