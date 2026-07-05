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
  <section class="relative isolate overflow-hidden bg-neutral-950 text-white">
    <span class="sr-only">{{ imageAlt }}</span>
    <NuxtPicture
      :src="image"
      alt=""
      class="absolute inset-0 -z-10 block size-full"
      :img-attrs="{ class: 'size-full object-cover opacity-35' }"
    />
    <div class="absolute inset-0 -z-10 bg-gradient-to-b from-neutral-950/80 via-neutral-950/60 to-neutral-950/85" />

    <UContainer class="flex min-h-screen items-center justify-center py-24">
      <div class="site-reveal mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
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
          class="flex flex-wrap justify-center gap-3"
        >
          <slot name="actions" />
        </div>
      </div>
    </UContainer>
  </section>
</template>
