import path from 'path';
import { z } from 'zod';
import { defineContentConfig, defineCollection } from '@nuxt/content';
import { asOgImageCollection } from 'nuxt-og-image/content';

export default defineContentConfig({
  collections: {
    articles: defineCollection(
      asOgImageCollection({
        type: 'page',
        source: {
          cwd: path.resolve('public/_content/articles'),
          include: '**/*.md',
        },
        schema: z.object({
          slug: z.string().regex(/^\d{8}-[\w-]+$/),
          title: z.string(),
          author: z.string().default('Pixelsia'),
          publishedAt: z.coerce.date(),
          tags: z.array(z.string()).default([]),
          hotDays: z.number().int().default(7),
        }),
      }),
    ),
  },
});
