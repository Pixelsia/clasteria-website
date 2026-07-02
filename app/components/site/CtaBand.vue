<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryTo: string;
  secondaryLabel?: string;
  secondaryTo?: string;
}>();
</script>

<template>
  <section class="site-hero-bg text-white">
    <UContainer class="py-14">
      <div class="site-reveal grid gap-8 md:grid-cols-3 md:items-center">
        <div class="md:col-span-2">
          <p class="text-xs font-black uppercase tracking-widest text-primary-300">
            {{ eyebrow }}
          </p>
          <h2 class="mt-4 text-3xl font-black leading-tight md:text-5xl">
            {{ title }}
          </h2>
          <p class="mt-5 max-w-3xl leading-8 text-neutral-200">
            {{ description }}
          </p>
        </div>
        <div class="flex flex-wrap gap-3 md:justify-end">
          <UButton
            :to="primaryTo"
            color="primary"
            size="xl"
            trailing-icon="i-heroicons-arrow-right"
          >
            {{ primaryLabel }}
          </UButton>
          <UButton
            v-if="secondaryLabel && secondaryTo"
            :to="secondaryTo"
            color="neutral"
            variant="outline"
            size="xl"
          >
            {{ secondaryLabel }}
          </UButton>
        </div>
      </div>
    </UContainer>
  </section>
</template>
