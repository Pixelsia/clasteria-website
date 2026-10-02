import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref, toValue } from 'vue';
import { prerenderPublishedArticleRoutes, useArticle, useArticlesList } from './articles';

type Fixture = Record<string, unknown> & { slug: string };

const publishedArticle: Fixture = {
  slug: '20261001-confirmed',
  title: '確認済み記事のテスト',
  description: 'テスト用の記事です。',
  author: 'Clasteria',
  seo: {},
  publishedAt: '2026-10-01T00:00:00.000Z',
  publicationStatus: 'published',
  brand: 'clasteria',
  tags: [],
  hotDays: 7,
  body: { type: 'minimark', value: [['p', {}, '本文のテスト']] },
};

const excludedArticles: Fixture[] = [
  { ...publishedArticle, slug: '20261001-draft', publicationStatus: 'draft' },
  { ...publishedArticle, slug: '20261001-unconfirmed-status', publicationStatus: undefined },
  { ...publishedArticle, slug: '20261001-unconfirmed-brand', brand: undefined },
  { ...publishedArticle, slug: '20261001-pixelsia', brand: 'pixelsia' },
  { ...publishedArticle, slug: '20261001-connectia', brand: 'connectia' },
  { ...publishedArticle, slug: '20261003-future', publishedAt: '2026-10-03T00:00:00.000Z' },
  { ...publishedArticle, slug: '20261001-missing-date', publishedAt: undefined },
];

function mockCollection(fixtures: Fixture[]) {
  vi.stubGlobal('queryCollection', vi.fn((collection: string) => {
    expect(collection).toBe('articles');
    let items = [...fixtures];
    const query = {
      where: (field: string, operator: string, value: string) => {
        items = items.filter((item) => {
          if (operator === '=') return item[field] === value;
          if (operator === '<=') return typeof item[field] === 'string' && item[field] <= value;
          throw new Error(`Unexpected operator: ${operator}`);
        });
        return query;
      },
      order: (field: string, direction: string) => {
        expect(direction).toBe('DESC');
        items.sort((a, b) => String(b[field]).localeCompare(String(a[field])));
        return query;
      },
      select: () => query,
      skip: (amount: number) => {
        items = items.slice(amount);
        return query;
      },
      limit: (amount: number) => {
        items = items.slice(0, amount);
        return query;
      },
      all: async () => items,
      first: async () => items[0] ?? null,
      count: async () => items.length,
    };
    return query;
  }));
}

describe('published Clasteria articles', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-02T00:00:00.000Z'));
    vi.stubGlobal('toValue', toValue);
    let hasRequestContext = false;
    vi.stubGlobal('useNuxtApp', () => ({
      runWithContext: (callback: () => void) => {
        hasRequestContext = true;
        try {
          return callback();
        }
        finally {
          hasRequestContext = false;
        }
      },
    }));
    vi.stubGlobal('prerenderRoutes', vi.fn(() => expect(hasRequestContext).toBe(true)));
    vi.stubGlobal('useAsyncData', async (
      _key: unknown,
      handler: () => Promise<unknown>,
      options: { transform: (value: unknown) => unknown },
    ) => ({ data: ref(options.transform(await handler())) }));
    mockCollection([publishedArticle, ...excludedArticles]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('uses the same publication gate for the list and total', async () => {
    const list = await useArticlesList();
    expect(list.value.articles.map(article => article.slug)).toEqual([publishedArticle.slug]);
    expect(list.value.total).toBe(1);
  });

  it.each(excludedArticles)('does not expose $slug through its direct URL', async ({ slug }) => {
    const article = await useArticle(slug);
    expect(article.value).toBeNull();
  });

  it('returns null for a missing slug', async () => {
    expect((await useArticle('20261001-missing')).value).toBeNull();
  });

  it('preserves the published article body and date', async () => {
    const article = await useArticle(publishedArticle.slug);
    expect(article.value?.body).toEqual(publishedArticle.body);
    expect(article.value?.publishedAt).toEqual(new Date('2026-10-01T00:00:00.000Z'));
  });

  it('includes an article at the exact publication time', async () => {
    mockCollection([{ ...publishedArticle, publishedAt: '2026-10-02T00:00:00.000Z' }]);
    expect((await useArticlesList()).value.total).toBe(1);
    expect((await useArticle(publishedArticle.slug)).value).not.toBeNull();
  });

  it('paginates only public articles while retaining the filtered total', async () => {
    mockCollection([
      ...excludedArticles,
      publishedArticle,
      { ...publishedArticle, slug: '20260930-older', publishedAt: '2026-09-30T00:00:00.000Z' },
    ]);
    const page = ref(1);
    const list = await useArticlesList({ page, limit: 1 });
    expect(list.value.articles.map(article => article.slug)).toEqual(['20260930-older']);
    expect(list.value.total).toBe(2);
  });

  it('returns an empty list when no confirmed news is available', async () => {
    mockCollection(excludedArticles);
    expect((await useArticlesList()).value).toEqual({ articles: [], total: 0 });
  });

  it('prerenders all eligible article URLs beyond the first archive page', async () => {
    const archive = Array.from({ length: 25 }, (_, index) => ({
      ...publishedArticle,
      slug: `20261001-archive-${index}`,
    }));
    mockCollection([...archive, ...excludedArticles]);

    expect((await useArticlesList()).value.articles).toHaveLength(20);
    await prerenderPublishedArticleRoutes();

    expect(prerenderRoutes).toHaveBeenCalledWith(archive.map(article => `/articles/${article.slug}`));
  });

  it('registers no article routes when no confirmed news is available', async () => {
    mockCollection(excludedArticles);
    await prerenderPublishedArticleRoutes();
    expect(prerenderRoutes).toHaveBeenCalledWith([]);
  });
});
