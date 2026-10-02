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
          // 既存記事も、内容・日時・対象ブランドの確認が済むまでは公開しない。
          publicationStatus: z.enum(['draft', 'published']).default('draft'),
          brand: z.enum(['clasteria', 'pixelsia', 'connectia', 'unconfirmed']).default('unconfirmed'),
          tags: z.array(z.string()).default([]),
          hotDays: z.number().int().default(7),
        }),
      }),
    ),
  },
});
