<script setup lang="ts">
interface Props {
  title: string;
  date: string;
  tag?: string;
  imageUrl?: string;
  href?: string;
}

withDefaults(defineProps<Props>(), {
  tag: 'News',
  imageUrl: '',
  href: '#',
});
</script>

<template>
  <a
    :href="href"
    class="block group"
  >
    <div class="h-48 bg-neutral-200 dark:bg-neutral-600 rounded-xl mb-4 overflow-hidden">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="title"
        class="w-full h-full object-cover"
      >
    </div>
    <div class="flex items-center gap-2 mb-2">
      <span class="bg-primary-100 dark:bg-primary-700 text-primary-600 dark:text-primary-300 text-xs px-2 py-1 rounded-full">
        {{ tag }}
      </span>
      <span class="text-primary-600 dark:text-primary-300 text-xs">{{ date }}</span>
    </div>
    <h3 class="font-bold text-primary-900 dark:text-primary-200 group-hover:underline">
      {{ title }}
    </h3>
  </a>
</template>
