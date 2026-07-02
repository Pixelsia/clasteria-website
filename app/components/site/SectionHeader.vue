<script setup lang="ts">
const props = withDefaults(defineProps<{
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
}>(), {
  description: '',
  align: 'left',
});

const alignmentClass = computed(() => props.align === 'center' ? 'mx-auto text-center items-center' : 'items-start');
</script>

<template>
  <div :class="['flex max-w-3xl flex-col gap-4', alignmentClass]">
    <p class="text-xs font-black uppercase tracking-widest text-primary-600">
      {{ eyebrow }}
    </p>
    <h2 class="text-3xl font-black leading-tight text-neutral-950 md:text-5xl">
      {{ title }}
    </h2>
    <p
      v-if="description"
      class="text-base leading-8 text-neutral-700 md:text-lg"
    >
      {{ description }}
    </p>
  </div>
</template>
