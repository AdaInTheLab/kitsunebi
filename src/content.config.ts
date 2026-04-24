import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// YAML auto-parses unquoted ISO dates to Date objects. Normalize to YYYY-MM-DD string
// so we don't have to care downstream.
const dateish = z
  .union([z.string(), z.date()])
  .transform((v) => (v instanceof Date ? v.toISOString().split('T')[0] : v));

const cards = defineCollection({
  loader: glob({ pattern: '*.md', base: './cards' }),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    status: z.enum(['backlog', 'in_progress', 'blocked', 'done', 'archived']),
    owner: z.string(),
    collaborators: z.array(z.string()).default([]),
    due: dateish.nullable().optional(),
    created: dateish.optional(),
    completed: dateish.optional(),
    tags: z.array(z.string()).default([]),
    blocked_by: z.array(z.string()).default([]),
  }),
});

export const collections = { cards };
