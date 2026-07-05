<script setup lang="ts">
import type { FooterColumn } from '@nuxt/ui';

const columns: FooterColumn[] = [
  {
    label: 'コンテンツ',
    children: primaryNavItems.slice(1, 5),
  },
  {
    label: 'サポート',
    children: primaryNavItems.slice(5),
  },
  {
    label: 'アカウント',
    children: accountNavItems,
  },
];
</script>

<template>
  <UFooter
    class="border-t-4 border-secondary-500 bg-green-800 text-white"
    :ui="{
      top: 'py-12!',
      bottom: 'pt-0! pb-8!',
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
            label: 'text-green-50! text-sm! font-black! uppercase tracking-widest border-b border-green-700 pb-3 mb-4',
            list: 'mt-0! space-y-2',
            link: 'text-green-100! hover:text-white!',
          }"
        >
          <template #left>
            <div>
              <div class="inline-flex items-center gap-3">
                <NuxtImg
                  src="/images/pixelsia_header_logo.png"
                  alt="Pixelsia"
                  class="site-brand-lockup h-8 w-auto rounded-lg object-contain px-2 py-1"
                />
                <span
                  class="h-6 w-px bg-green-600"
                  aria-hidden="true"
                />
                <span class="text-sm font-bold tracking-wide text-green-100 md:text-base">Clasteria</span>
              </div>
              <p class="mt-4 max-w-xs text-sm leading-7 text-green-50">
                Minecraft に Pixelsia の世界を作り、遊びと学びを同じ場所で扱う公式サイトです。
              </p>
            </div>
          </template>
        </UFooterColumns>
      </UContainer>
    </template>

    <template #bottom>
      <UContainer class="flex flex-col gap-6 border-t border-green-700 pt-8 md:flex-row md:items-end md:justify-between">
        <div class="inline-flex items-center gap-3">
          <NuxtImg
            src="/images/pixelsia_header_logo.png"
            alt="Pixelsia"
            class="site-brand-lockup h-8 w-auto rounded-lg object-contain px-2 py-1"
          />
          <span
            class="h-6 w-px bg-green-600"
            aria-hidden="true"
          />
          <span class="text-sm font-bold tracking-wide text-green-100 md:text-base">Clasteria</span>
        </div>
        <p class="text-sm text-green-100">
          &copy; 2026 Pixelsia
        </p>
      </UContainer>
    </template>
  </UFooter>
</template>
