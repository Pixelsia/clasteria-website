import type { MinimarkTree } from 'minimark';
import type { ArticlesCollectionItem } from '@nuxt/content';
import type { OgImageOptions } from './images';

export type ArticleMeta = {
  slug: string;
  seo: Record<string, unknown>;
  ogImage?: OgImageOptions;
  title: string;
  description: string;
  author: string;
  publishedAt: Date;
  tags: string[];
  hotDays: number;
};

export type ArticlesList = {
  articles: ArticleMeta[];
  total: number;
};

export type Article = ArticleMeta & {
  body: MinimarkTree;
};

function toArticleMeta(item: ArticlesCollectionItem): ArticleMeta {
  // content.config.ts のスキーマでバリデーションされているはずなので、ここでのバリデーションは不要
  return {
    slug: item.slug,
    seo: item.seo,
    ogImage: item.ogImage,
    title: item.title,
    description: item.description,
    author: item.author!,
    publishedAt: new Date(item.publishedAt),
    tags: item.tags ?? [],
    hotDays: item.hotDays!,
  };
}

/**
 * 記事一覧を取得する。
 * @param options.page 現在のページ番号 (0-indexed)
 * @param options.limit 1 ページあたりの取得件数
 */
export async function useArticlesList(options: {
  page?: MaybeRefOrGetter<number>;
  limit?: MaybeRefOrGetter<number>;
} = {}): Promise<Ref<ArticlesList>> {
  const { page = 0, limit = 20 } = options;

  const { data: articlesList } = await useAsyncData(
    () => `articles?page=${toValue(page)}&limit=${toValue(limit)}`,
    // SSG なので、options のバリデーションは不要
    () => Promise.all([
      queryCollection('articles')
        .where('publishedAt', '<=', new Date().toISOString())
        .order('publishedAt', 'DESC')
        .skip(toValue(page) * toValue(limit))
        .limit(toValue(limit))
        .all(),
      queryCollection('articles').count(),
    ]),
    {
      default: () => ({ articles: [], total: 0 }),
      // transform で整形することで、整形前のデータをペイロードに含めないようにできる
      transform: ([items, total]) => ({
        articles: items.map(item => toArticleMeta(item)),
        total,
      }),
    },
  );

  return articlesList;
}

/**
 * 記事を取得する。
 * @param slug 記事の slug
 */
export async function useArticle(slug: string): Promise<Ref<Article | null>> {
  const { data: article } = await useAsyncData(
    `articles/${slug}`,
    () => queryCollection('articles').where('slug', '=', slug).first(),
    {
      default: () => null,
      // transform で整形することで、整形前のデータをペイロードに含めないようにできる
      transform: item => item && {
        ...toArticleMeta(item),
        body: item.body,
      },
    },
  );

  return article;
}
