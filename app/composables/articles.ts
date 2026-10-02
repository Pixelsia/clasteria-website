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

function queryPublishedArticles(now: string) {
  // 一覧・件数・直接 URL に同じ公開条件を適用し、未確認の記事は公開しない。
  return queryCollection('articles')
    .where('publicationStatus', '=', 'published')
    .where('brand', '=', 'clasteria')
    .where('publishedAt', '<=', now);
}

/**
 * 一覧の表示件数に関係なく、公開済み記事すべての静的 HTML を生成対象にする。
 * @remark サーバー側のページ処理から呼び出す。
 */
export async function prerenderPublishedArticleRoutes(): Promise<void> {
  const nuxtApp = useNuxtApp();
  const articles = await queryPublishedArticles(new Date().toISOString())
    .select('slug')
    .all();
  // await の後も、prerenderRoutes が必要とするリクエストのコンテキストを維持する。
  nuxtApp.runWithContext(() => prerenderRoutes(articles.map(article => `/articles/${article.slug}`)));
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
    () => {
      const now = new Date().toISOString();
      return Promise.all([
        queryPublishedArticles(now)
          .order('publishedAt', 'DESC')
          .skip(toValue(page) * toValue(limit))
          .limit(toValue(limit))
          .all(),
        queryPublishedArticles(now).count(),
      ]);
    },
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
    () => queryPublishedArticles(new Date().toISOString()).where('slug', '=', slug).first(),
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
