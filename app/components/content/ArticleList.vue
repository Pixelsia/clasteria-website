<script setup lang="ts">
import PostCard from '~/components/post/Card.vue';
import { useArticlesList } from '~/composables/articles';
import { useOgImageSrc } from '~/composables/images';
import { formatDate } from '~/utils/date';

defineProps<{ content: Record<string, string> }>();

const page = ref(1);
const pageSize = 20;
const articlesList = await useArticlesList({ page: () => page.value - 1, limit: pageSize });
const displayArticles = computed(() => articlesList.value.articles.map(article => ({
  ...article,
  ogImageSrc: article.ogImage?.url ? useOgImageSrc(`/articles/${article.slug}`, article.ogImage) : '',
  href: `/articles/${article.slug}`,
  date: formatDate(article.publishedAt, { includeTime: false }),
})));
</script>

<template>
  <UContainer
    as="section"
    data-page-container
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
      class="site-reveal rounded-lg border border-neutral-200 bg-neutral-50 p-8"
    >
      <h2 class="text-2xl font-black text-neutral-950">
        {{ content.emptyTitle }}
      </h2>
      <p class="mt-3 leading-7 text-neutral-700">
        {{ content.emptyDescription }}
      </p>
    </div>
    <nav
      v-if="articlesList.total > pageSize"
      aria-label="ニュース一覧のページ切り替え"
      class="mt-10 flex justify-center"
    >
      <UPagination
        v-model:page="page"
        :items-per-page="pageSize"
        :total="articlesList.total"
      />
    </nav>
  </UContainer>
</template>
