<script setup lang="ts">
const { data: articles } = await useAsyncData('articles', () =>
  queryCollection('articles').select('stem', 'title', 'author', 'date', 'tags', 'hotDays').all(),
);

const getSlugFromStem = (stem: string) => (stem.match(/\/([^/]+)\/index$/) as [string, string])[1];
</script>

<template>
  <article>
    <h1>お知らせ</h1>
    <ul>
      <li
        v-for="article in articles"
        :key="article.stem"
      >
        <NuxtLink :to="`/articles/${getSlugFromStem(article.stem)}`">
          <ClientOnly>{{ new Date(article.date).toLocaleDateString() }}</ClientOnly> - {{ article.title }}
        </NuxtLink>
      </li>
    </ul>
  </article>
</template>
