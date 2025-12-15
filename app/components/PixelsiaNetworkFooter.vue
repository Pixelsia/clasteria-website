<script setup lang="ts">
const footerColumns = [
  {
    title: 'コンテンツ',
    links: [
      { label: 'プログラミング', href: '#' },
      { label: 'おにごっこ', href: '#' },
      { label: 'ランキング', href: '#' },
    ],
  },
  {
    title: 'サポート',
    links: [
      { label: 'ヘルプセンター', href: '#' },
      { label: 'お問い合わせ', href: '#' },
      { label: 'FAQ', href: '#' },
    ],
  },
  {
    title: 'アカウント',
    links: [
      { label: 'ログイン', href: '#' },
      { label: '登録', href: '#' },
      { label: 'プロフィール', href: '#' },
    ],
  },
];
</script>

<template>
  <footer class="bg-primary-700 border-t-8 border-secondary-600 pt-14 pb-8">
    <UContainer>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div class="text-primary-100">
          <div class="text-white text-lg font-bold mb-4">
            Pixelsia Network
          </div>
          <p class="text-sm">
            森の中でコードを育てよう。プログラミングとおにごっこを組み合わせた新しい学習体験を提供します。
          </p>
        </div>

        <div
          v-for="column in footerColumns"
          :key="column.title"
        >
          <h3 class="text-white border-b border-primary-600 pb-2 mb-4">
            {{ column.title }}
          </h3>
          <ul class="space-y-2 text-primary-100 text-sm">
            <li
              v-for="link in column.links"
              :key="link.label"
            >
              <NuxtLink
                :to="link.href"
                class="hover:text-white"
              >
                {{ link.label }}
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
      <div class="text-center text-primary-400 text-xs">
        © 2025 Pixelsia Network. All rights reserved.
      </div>
    </UContainer>
  </footer>
</template>
