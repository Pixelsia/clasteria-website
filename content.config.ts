import { defineContentConfig, defineCollection, z } from '@nuxt/content';
import path from 'path';

export default defineContentConfig({
  collections: {
    articles: defineCollection({
      type: 'page',
      source: {
        cwd: path.resolve(process.cwd(), process.env.WEBSITE_CONTENT || 'content-demo'),
        include: 'articles/**/index.md',
      },
      schema: z.object({
        title: z.string(),
        author: z.string().default('Pixelsia'),
        date: z.coerce.date(),
        tags: z.array(z.string()).default([]),
        hotDays: z.number().default(0),
      }),
    }),
  },
});
