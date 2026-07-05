<script setup lang="ts">
withDefaults(defineProps<{
  title: string;
  date: string;
  tag?: string;
  imageUrl?: string;
  href?: string;
}>(), {
  tag: 'News',
  imageUrl: '',
  href: '/articles',
});
</script>

<template>
  <NuxtLink
    :to="href"
    class="block group"
  >
    <div class="mb-4 flex h-48 items-center justify-center overflow-hidden rounded-lg bg-neutral-200">
      <NuxtPicture
        v-if="imageUrl"
        :src="imageUrl"
        class="w-full h-full"
        :img-attrs="{
          class: 'w-full h-full object-cover',
          alt: title,
        }"
      />
      <UIcon
        v-else
        name="i-heroicons-newspaper"
        class="size-10 text-neutral-500"
      />
    </div>
    <div class="flex items-center gap-2 mb-2">
      <span class="rounded-lg bg-primary-100 px-2 py-1 text-xs font-bold text-primary-700">
        {{ tag }}
      </span>
      <span class="text-xs text-neutral-600">{{ date }}</span>
    </div>
    <h3 class="font-black text-neutral-950 group-hover:text-primary-700">
      {{ title }}
    </h3>
  </NuxtLink>
</template>
