<script setup lang="ts">
type PageTabItem = {
  label: string;
  to: string;
  icon?: string;
  active?: boolean;
};

defineProps<{
  items: PageTabItem[];
}>();
</script>

<template>
  <nav
    class="overflow-x-auto"
    aria-label="ページ内ナビゲーション"
  >
    <div class="grid min-w-max grid-cols-3 gap-3 rounded-lg border border-primary-100 bg-white p-2 md:min-w-0">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black text-neutral-700 transition-colors hover:bg-primary-50 hover:text-primary-700"
        :class="item.active ? 'bg-primary-600 text-white hover:bg-primary-700 hover:text-white' : ''"
      >
        <UIcon
          v-if="item.icon"
          :name="item.icon"
          class="size-4"
        />
        {{ item.label }}
      </NuxtLink>
    </div>
  </nav>
</template>
