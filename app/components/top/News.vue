<script setup lang="ts">
const articlesList = await useArticlesList({ limit: 2 });

const displayArticles = computed(() => articlesList.value.articles.map(article => ({
  ...article,
  href: `/articles/${article.slug}`,
  date: formatDate(article.publishedAt, { includeTime: false }),
  imageUrl: article.ogImage?.url ? useOgImageSrc(`/articles/${article.slug}`, article.ogImage) : '',
})));
</script>

<template>
  <UContainer
    as="section"
    class="py-20"
  >
    <div class="site-reveal rounded-lg border border-neutral-200 bg-neutral-50 p-6 md:p-10">
      <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <SiteSectionHeader
          eyebrow="NEWS"
          title="ニュース"
          description="HP 仕様書にあるニュース面は、既存の記事機能を入口として表示します。"
        />
        <UButton
          to="/articles"
          color="primary"
          trailing-icon="i-heroicons-arrow-right"
          variant="ghost"
        >
          すべて見る
        </UButton>
      </div>

      <div
        v-if="displayArticles.length > 0"
        class="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2"
      >
        <PostCard
          v-for="article in displayArticles"
          :key="article.slug"
          :title="article.title"
          :date="article.date"
          tag="News"
          :href="article.href"
          :image-url="article.imageUrl"
        />
      </div>
      <p
        v-else
        class="mt-10 rounded-lg border border-neutral-200 bg-white p-6 text-neutral-700"
      >
        記事が登録されていない場合は、ニュース一覧の枠だけを表示します。
      </p>
    </div>
  </UContainer>
</template>
