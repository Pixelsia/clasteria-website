<script setup lang="ts">
defineProps<{
  icon: string;
  title: string;
  body: string;
}>();
</script>

<template>
  <div class="h-full rounded-lg border border-neutral-200 bg-white p-6">
    <div class="mb-5 flex size-12 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
      <UIcon
        :name="icon"
        class="size-6"
      />
    </div>
    <h3 class="text-xl font-black text-neutral-950">
      {{ title }}
    </h3>
    <p class="mt-3 leading-7 text-neutral-700">
      {{ body }}
    </p>
  </div>
</template>
