<script setup lang="ts">
definePageMeta({
  key: route => route.path,
  layout: 'docs',
});

const route = useRoute();
const slug = route.params.slug as string;
const article = await useArticle(slug).then((article) => {
  if (article.value == null) {
    throw createError({ statusCode: 404, statusMessage: 'Article not found', fatal: true });
  }
  return article as Ref<Article>;
});

useSeoMeta(article.value.seo);
defineOgImage(useResolvedOgImage(article.value.ogImage));
</script>

<template>
  <UPage as="article">
    <UPageHeader
      :headline="formatDate(article.publishedAt)"
      :title="article.title"
      :description="`投稿者: ${article.author}`"
    />
    <UPageBody as="section">
      <ContentRenderer :value="article.body" />
    </UPageBody>
  </UPage>
</template>
