<script setup lang="ts">
import type { FooterColumn } from '@nuxt/ui';

const columns: FooterColumn[] = [
  {
    label: 'コンテンツ',
    children: [
      { label: 'プログラミング', to: '#' },
      { label: 'おにごっこ', to: '#' },
      { label: 'ランキング', to: '#' },
    ],
  },
  {
    label: 'サポート',
    children: [
      { label: 'ヘルプセンター', to: '#' },
      { label: 'お問い合わせ', to: '#' },
      { label: 'FAQ', to: '#' },
    ],
  },
  {
    label: 'アカウント',
    children: [
      { label: 'ログイン', to: '#' },
      { label: '登録', to: '#' },
      { label: 'プロフィール', to: '#' },
    ],
  },
];
</script>

<template>
  <UFooter
    class="bg-primary-700 border-t-8 border-secondary-600"
    :ui="{
      top: 'pt-14! pb-8!',
      bottom: 'pt-0! pb-8! text-center',
      container: 'p-0!',
    }"
  >
    <template #top>
      <UContainer>
        <UFooterColumns
          :columns="columns"
          :ui="{
            root: 'md:grid md:grid-cols-4 md:gap-8',
            left: 'mb-8 md:mb-0',
            center: 'flex flex-col md:grid grid-flow-col auto-cols-fr gap-8 md:col-span-3',
            label: 'text-neutral-50! text-base! font-normal! border-b border-primary-600 pb-2 mb-4',
            list: 'mt-0! space-y-2',
            link: 'text-primary-100! hover:text-neutral-50!',
          }"
        >
          <template #left>
            <div class="text-primary-200/80">
              <div class="text-neutral-50 text-lg font-bold mb-4">
                Pixelsia
              </div>
              <p class="text-sm">
                新しい創造を、ここから
              </p>
            </div>
          </template>
        </UFooterColumns>
      </UContainer>
    </template>

    <template #bottom>
      <NuxtImg
        src="/pixelsia-logo-text.svg"
        alt="&copy; 2026 Pixelsia"
        class="w-full mt-24"
      />
    </template>
  </UFooter>
</template>
