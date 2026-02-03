<script setup lang="ts">
const route = useRoute();
const slug = route.params.slug as string;

const { data: post } = await useAsyncData(
  `articles/${slug}`,
  () => queryCollection('articles').where('stem', 'LIKE', `%/${slug}/index`).first(),
);

if (post.value == null) {
  throw createError({ statusCode: 404, statusMessage: 'Article not found' });
}

const ogImage = computed(() => `/assets/articles/${slug}/ogp.jpg`);

useSeoMeta({
  title: post.value.title,
  ogTitle: post.value.title,
  ogImage: ogImage.value,
  description: post.value.title, // TODO: 中身から抜き出す
});
</script>

<template>
  <article>
    <UContainer as="header">
      <h1>{{ post!.title }}</h1>
      <div>
        <time>{{ new Date(post!.date).toLocaleDateString() }}</time>
        <div>
          <span>{{ post!.author }}</span>
        </div>
      </div>
    </UContainer>
    <UContainer as="section">
      <ContentRenderer :value="post!" />
    </UContainer>
  </article>
</template>
