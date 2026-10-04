<script setup lang="ts">
import type { FooterColumn } from '@nuxt/ui';

const columns: FooterColumn[] = [
  {
    label: 'Clasteria',
    children: primaryNavItems,
  },
  {
    label: 'Pixelsia',
    children: siteNavItems.filter(item => item.external).map(item => ({
      label: `${item.label}（外部サイト）`,
      to: item.to,
      target: '_blank',
      rel: 'noopener noreferrer',
      trailingIcon: 'i-heroicons-arrow-up-right',
    })),
  },
  {
    label: '関連サービス',
    children: relatedServices.map(service => ({
      ...service,
      target: '_blank',
      rel: 'noopener noreferrer',
      trailingIcon: 'i-heroicons-arrow-up-right',
    })),
  },
];
</script>

<template>
  <UFooter
    class="border-t border-neutral-200 bg-neutral-950 text-white"
    :ui="{
      top: 'py-12!',
      container: 'hidden!',
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
            label: 'text-neutral-50! text-sm! font-black! uppercase tracking-widest border-b border-neutral-800 pb-3 mb-4',
            list: 'mt-0! space-y-2',
            link: 'text-neutral-300! hover:text-primary-300!',
          }"
        >
          <template #left>
            <div>
              <div class="inline-flex items-center gap-3">
                <NuxtImg
                  src="/images/pixelsia_header_logo.png"
                  alt="Pixelsia"
                  class="h-6 w-auto object-contain md:h-7"
                />
                <span
                  class="h-6 w-px bg-neutral-700"
                  aria-hidden="true"
                />
                <span class="text-sm font-bold tracking-wide text-neutral-300 md:text-base">Clasteria</span>
              </div>
              <p class="mt-4 max-w-xs text-sm leading-7 text-neutral-300">
                Minecraft の世界から、新しい体験を。Clasteria のお知らせとお問い合わせ情報をお届けします。
              </p>
              <p class="mt-4 text-sm text-neutral-400">
                &copy; 2026 Pixelsia
              </p>
            </div>
          </template>
        </UFooterColumns>
      </UContainer>
    </template>
  </UFooter>
</template>
