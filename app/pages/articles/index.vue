<script setup lang="ts">
const articlesList = await useArticlesList();

const displayArticles = articlesList.value.articles.map(article => ({
  ...article,
  ogImageSrc: useOgImageSrc(`/articles/${article.slug}`, article.ogImage),
}));

// const sortedArticles = shallowRef<NonNullable<typeof articles.value>>([]);
// onMounted(() => {
//   sortedArticles.value = articles.value!
//     .map(item => ({ ...item, hotScore: calculateHotScore(item.hotDays, item.publishedAt) }))
//     .toSorted((a, b) => a.hotScore - b.hotScore);
// });
</script>

<template>
  <article>
    <h1>お知らせ</h1>
    <ul>
      <li
        v-for="article in displayArticles"
        :key="article.slug"
      >
        <NuxtLink :to="`/articles/${article.slug}`">
          <NuxtPicture
            :src="article.ogImageSrc"
            :width="320"
            :height="168"
            fit="cover"
            :alt="article.title"
          />
          {{ formatDate(article.publishedAt, { includeTime: false }) }} - {{ article.title }}
          <div>{{ article.description }}</div>
        </NuxtLink>
      </li>
    </ul>
  </article>
</template>
