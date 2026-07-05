<script setup lang="ts">
defineProps<{
  title?: string;
  items: TodoItem[];
}>();
</script>

<template>
  <div class="rounded-lg border border-secondary-200 bg-secondary-50 p-6">
    <p class="text-xs font-black uppercase tracking-widest text-secondary-700">
      TODO
    </p>
    <h2 class="mt-3 text-2xl font-black text-neutral-950">
      {{ title ?? '未決事項' }}
    </h2>
    <ul class="mt-5 grid gap-4 md:grid-cols-2">
      <li
        v-for="item in items"
        :key="item.title"
        class="rounded-lg border border-secondary-200 bg-white p-4"
      >
        <h3 class="font-black text-neutral-950">
          {{ item.title }}
        </h3>
        <p class="mt-2 leading-7 text-neutral-700">
          {{ item.body }}
        </p>
      </li>
    </ul>
  </div>
</template>
