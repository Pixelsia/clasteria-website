<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
}>();
</script>

<template>
  <section class="site-hero-bg overflow-hidden text-white">
    <UContainer class="grid gap-10 py-16 md:grid-cols-2 md:items-center lg:py-24">
      <div class="site-reveal site-reveal-left flex flex-col gap-6">
        <p class="text-xs font-black uppercase tracking-widest text-primary-300">
          {{ eyebrow }}
        </p>
        <h1 class="text-4xl font-black leading-tight md:text-6xl">
          {{ title }}
        </h1>
        <p class="max-w-2xl text-base leading-8 text-neutral-200 md:text-lg">
          {{ description }}
        </p>
        <div
          v-if="$slots.actions"
          class="flex flex-wrap gap-3"
        >
          <slot name="actions" />
        </div>
      </div>
      <div class="site-reveal site-reveal-right">
        <div class="site-media-frame">
          <NuxtPicture
            :src="image"
            :alt="imageAlt"
            class="block aspect-video w-full overflow-hidden rounded-lg"
            :img-attrs="{ class: 'size-full object-cover' }"
          />
        </div>
      </div>
    </UContainer>
  </section>
</template>
