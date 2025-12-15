<script setup lang="ts">
interface Props {
  backgroundImage: string;
  description: string;
  primaryButtonText: string;
  primaryButtonHref?: string;
  secondaryButtonText: string;
  secondaryButtonHref?: string;
}

withDefaults(defineProps<Props>(), {
  primaryButtonHref: '#',
  secondaryButtonHref: '#',
});
</script>

<template>
  <section class="relative h-screen -mt-20">
    <NuxtPicture
      :src="backgroundImage"
      class="absolute inset-0"
      :img-attrs="{ class: 'w-full h-full object-cover' }"
    />
    <div class="absolute inset-0 bg-primary-900/30 dark:bg-neutral-900/50" />
    <UContainer class="relative h-full flex items-center">
      <div class="text-center pt-32">
        <h1 class="text-6xl font-bold text-white dark:text-neutral-100 leading-tight">
          <slot name="title" />
        </h1>
        <p class="text-xl text-primary-100 leading-loose mt-6 max-w-2xl mx-auto">
          {{ description }}
        </p>
        <div class="flex gap-4 justify-center mt-8">
          <UButton
            color="secondary"
            size="lg"
            class="rounded-full px-8 py-3"
            :to="primaryButtonHref"
          >
            {{ primaryButtonText }}
          </UButton>
          <UButton
            variant="outline"
            class="text-white dark:text-neutral-100 border-white/30 dark:border-neutral-400/30 hover:bg-white/10 dark:hover:bg-neutral-700/50 rounded-full px-8 py-3"
            :to="secondaryButtonHref"
          >
            {{ secondaryButtonText }}
          </UButton>
        </div>
      </div>
    </UContainer>
  </section>
</template>
