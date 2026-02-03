<script setup lang="ts">
const newsItems = [
  {
    title: '春の大型アップデート：新しいマップ『巨木の森』が追加されました',
    date: '2025年12月15日',
    tag: 'News',
    href: '#',
  },
  {
    title: 'プログラミングコンテスト開催のお知らせ',
    date: '2025年12月10日',
    tag: 'News',
    href: '#',
  },
];
</script>

<template>
  <UContainer
    as="section"
    class="bg-neutral-50 dark:bg-neutral-700 border-2 border-primary-200 dark:border-primary-700 rounded-3xl"
  >
    <div class="mb-8">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-2xl text-primary-900 font-bold">
            最新ニュース
          </h2>
          <p class="text-primary-600 text-sm mt-1">
            最新のアップデートやイベント情報をお届けします
          </p>
        </div>
        <UButton
          variant="ghost"
          color="primary"
          trailing-icon="i-heroicons-arrow-right"
          class="gap-6"
          to="#"
        >
          すべて見る
        </UButton>
      </div>
    </div>
    <div class="p-12">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <PostCard
          v-for="news in newsItems"
          :key="news.title"
          :title="news.title"
          :date="news.date"
          :tag="news.tag"
          :href="news.href"
        />
      </div>
    </div>
  </UContainer>
</template>
