<script setup lang="ts">
import { homeSectionTemplates } from '~/utils/homeDocument';
withDefaults(defineProps<{ content?: Record<string, string>; aboutId?: string }>(), {
  content: () => ({ ...homeSectionTemplates.hero.content }),
  aboutId: undefined,
});
</script>

<template>
  <section
    class="relative isolate overflow-hidden bg-neutral-950 text-white"
  >
    <NuxtPicture
      :src="content.image"
      :alt="content.imageAlt"
      class="absolute inset-0 -z-10 block size-full"
      :img-attrs="{ class: 'size-full object-cover opacity-45' }"
      loading="eager"
    />
    <div class="absolute inset-0 -z-10 bg-gradient-to-b from-neutral-950/70 via-neutral-950/55 to-neutral-950/80" />

    <UContainer class="flex min-h-screen items-center justify-center py-24">
      <div class="site-reveal mx-auto flex max-w-5xl flex-col items-center gap-7 text-center">
        <p class="text-xs font-black uppercase tracking-widest text-primary-300">
          {{ content.eyebrow }}
        </p>
        <h1 class="text-5xl font-black leading-tight md:text-7xl">
          <span class="whitespace-pre-line">{{ content.title }}</span><br>
          <span class="text-primary-300">{{ content.brand }}</span>
        </h1>
        <p class="max-w-3xl whitespace-pre-line text-lg leading-9 text-neutral-100">
          {{ content.description }}
        </p>
        <div class="flex flex-wrap justify-center gap-3">
          <UButton
            :to="content.primaryTo"
            color="primary"
            trailing-icon="i-heroicons-arrow-right"
            size="xl"
          >
            {{ content.primaryLabel }}
          </UButton>
          <UButton
            :to="content.secondaryTo"
            color="neutral"
            variant="outline"
            size="xl"
            class="site-glass-action"
          >
            {{ content.secondaryLabel }}
          </UButton>
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
