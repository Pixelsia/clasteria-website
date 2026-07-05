<script setup lang="ts">
withDefaults(defineProps<{
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  icon?: string;
}>(), {
  icon: 'i-heroicons-sparkles',
});
</script>

<template>
  <section class="site-page-surface">
    <span class="sr-only">{{ imageAlt }}</span>
    <UContainer class="py-12 md:py-16">
      <div class="site-reveal flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-start">
          <span class="flex size-16 shrink-0 items-center justify-center rounded-lg bg-white text-primary-700">
            <UIcon
              :name="icon"
              class="size-8"
            />
          </span>
          <div>
            <p class="text-xs font-black uppercase tracking-widest text-primary-700">
              {{ eyebrow }}
            </p>
            <h1 class="mt-3 text-4xl font-black leading-tight text-neutral-950 md:text-5xl">
              {{ title }}
            </h1>
            <p class="mt-4 max-w-3xl text-base leading-8 text-neutral-700 md:text-lg">
              {{ description }}
            </p>
          </div>
        </div>
        <div
          v-if="$slots.actions"
          class="site-glass-panel flex flex-wrap gap-3 rounded-lg p-3"
        >
          <slot name="actions" />
        </div>
      </div>
    </UContainer>
  </section>
</template>
