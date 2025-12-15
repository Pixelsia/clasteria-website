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
  <section class="py-20">
    <UContainer>
      <div class="bg-white dark:bg-neutral-700 border border-primary-100 dark:border-primary-700 rounded-3xl shadow-sm p-12">
        <div class="flex justify-between items-center mb-8">
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
            to="#"
          >
            すべて見る
          </UButton>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <NewsCard
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
  </section>
</template>
