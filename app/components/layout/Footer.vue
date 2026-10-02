<script setup lang="ts">
import type { FooterColumn } from '@nuxt/ui';

const columns: FooterColumn[] = [
  {
    label: 'Clasteria',
    children: primaryNavItems.filter(item => ['/', '/articles', '/support'].includes(item.to)),
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
                  class="h-6 w-auto object-contain brightness-0 invert md:h-7"
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
            </div>
          </template>
        </UFooterColumns>
      </UContainer>
    </template>

    <template #bottom>
      <UContainer class="flex flex-col gap-6 border-t border-neutral-800 pt-8 md:flex-row md:items-end md:justify-between">
        <div class="inline-flex items-center gap-3">
          <NuxtImg
            src="/images/pixelsia_header_logo.png"
            alt="Pixelsia"
            class="h-6 w-auto object-contain opacity-80 brightness-0 invert md:h-7"
          />
          <span
            class="h-6 w-px bg-neutral-700"
            aria-hidden="true"
          />
          <span class="text-sm font-bold tracking-wide text-neutral-400 md:text-base">Clasteria</span>
        </div>
        <p class="text-sm text-neutral-400">
          &copy; 2026 Pixelsia
        </p>
      </UContainer>
    </template>
  </UFooter>
</template>
