<script setup lang="ts">
useSiteReveal();

useSeoMeta({
  title: 'ニュース',
  description: 'Clasteria と Pixelsia 関連のニュース一覧です。',
});

const articlesList = await useArticlesList();

const displayArticles = computed(() => articlesList.value.articles.map(article => ({
  ...article,
  ogImageSrc: article.ogImage?.url ? useOgImageSrc(`/articles/${article.slug}`, article.ogImage) : '',
  href: `/articles/${article.slug}`,
  date: formatDate(article.publishedAt, { includeTime: false }),
})));
</script>

<template>
  <article>
    <SitePageHero
      eyebrow="NEWS"
      title="ニュース"
      description="HP 仕様書では、Pixelsia と Connectia におけるニュースを紹介するページです。この実装では既存の articles 機能を壊さず、記事一覧として表示します。"
      image="/images/clasteria/home-main-visual.png"
      image-alt="ニュースのイメージ"
      icon="i-heroicons-newspaper"
    />

    <UContainer
      as="section"
      class="pb-14 md:pb-20"
    >
      <div
        v-if="displayArticles.length > 0"
        class="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
      >
        <PostCard
          v-for="article in displayArticles"
          :key="article.slug"
          class="site-reveal"
          :title="article.title"
          :date="article.date"
          tag="News"
          :href="article.href"
          :image-url="article.ogImageSrc"
        />
      </div>

      <div
        v-else
        class="site-section-card site-reveal p-8"
      >
        <h2 class="text-2xl font-black text-neutral-950">
          記事はまだありません
        </h2>
        <p class="mt-3 leading-7 text-neutral-700">
          ニュースの対象範囲と運用方法は未決です。
        </p>
      </div>

      <SiteTodoNotice
        class="site-reveal mt-10"
        title="ニュースの未決事項"
        :items="[unresolvedItems[4]]"
      />
    </UContainer>
  </article>
</template>
