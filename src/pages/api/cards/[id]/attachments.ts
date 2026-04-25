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
import { mkdir, writeFile, access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { json, jsonError, requireSameOrigin } from '../../../../lib/api-helpers';
import { scheduleGitSync } from '../../../../lib/git-sync';

const MAX_BYTES = 10 * 1024 * 1024;
const ATTACHMENTS_DIR = join(process.cwd(), 'public', 'attachments');

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const reject = requireSameOrigin(ctx);
  if (reject) return reject;

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

  scheduleGitSync(`attach ${id}/${outName}${shouldAppend ? ' (+ body)' : ''}`);

  return json(201, {
    id,
    filename: outName,
    size: file.size,
    url,
    markdown,
    appended_to_body: shouldAppend,
  });
};

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
