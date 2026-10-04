<script setup lang="ts">
import { homeSectionTemplates } from '~/utils/homeDocument';
withDefaults(defineProps<{ content?: Record<string, string>; aboutId?: string; imageProvider?: 'none' }>(), {
  content: () => ({ ...homeSectionTemplates.hero.content }),
  aboutId: undefined,
  imageProvider: undefined,
});
</script>

<template>
  <section
    class="relative isolate overflow-hidden bg-neutral-950 text-white"
  >
    <NuxtPicture
      :src="content.image"
      :provider="imageProvider"
      :alt="content.imageAlt"
      class="absolute inset-0 -z-10 block size-full"
      :img-attrs="{ class: 'size-full object-cover opacity-75' }"
      loading="eager"
    />
    <!-- Keep the landscape visible while retaining contrast behind the centered copy. -->
    <div class="absolute inset-0 -z-10 bg-gradient-to-b from-neutral-950/55 via-neutral-950/40 to-neutral-950/65" />

    <UContainer class="flex min-h-screen items-center justify-center py-24">
      <div class="site-reveal mx-auto flex max-w-5xl flex-col items-center gap-7 text-center">
        <p class="whitespace-pre-line text-xs font-black uppercase tracking-widest text-primary-300">
          {{ content.eyebrow }}
        </p>
        <h1 class="text-5xl font-black leading-tight md:text-7xl">
          <span class="whitespace-pre-line">{{ content.title }}</span><br>
          <span class="whitespace-pre-line text-primary-300">{{ content.brand }}</span>
        </h1>
        <p class="max-w-3xl whitespace-pre-line text-lg leading-9 text-neutral-100">
          {{ content.description }}
        </p>
        <div class="hero-connection w-full max-w-md rounded-xl border border-white/25 bg-neutral-950/45 px-5 py-4">
          <p class="text-xs font-bold tracking-wide text-neutral-200">
            仮サーバーアドレス
          </p>
          <p class="mt-2 break-all font-mono text-xl font-bold text-white md:text-2xl">
            {{ content.serverAddress }}
          </p>
          <p class="mt-2 whitespace-pre-line text-xs leading-6 text-neutral-200">
            {{ content.serverNote }}
          </p>
          <NuxtLink
            :to="content.accessTo"
            class="mt-3 inline-flex items-center gap-2 text-sm font-bold text-white underline underline-offset-4"
          >
            {{ content.accessLabel }}
            <UIcon
              name="i-heroicons-arrow-right"
              class="size-4"
            />
          </NuxtLink>
        </div>
        <a
          v-if="aboutId"
          :href="`#${aboutId}`"
          class="flex w-fit items-center gap-3 text-sm font-black uppercase tracking-widest text-neutral-200 hover:text-primary-200"
        >
          <UIcon
            name="i-heroicons-chevron-down"
            class="size-5"
          />
          Scroll
        </a>
      </div>
    </UContainer>
  </section>
</template>
