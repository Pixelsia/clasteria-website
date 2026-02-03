<script setup lang="ts">
const navItems = [
  { label: 'ホーム', active: true },
  { label: 'プログラミング', active: false },
  { label: 'おにごっこ', active: false },
  { label: 'かくれんぼ', active: false },
  { label: 'ランキング', active: false },
  { label: 'サポート', active: false },
  { label: 'ニュース', active: false },
];

const route = useRoute();

const { y: scrollY } = useScroll(window);
const isHeaderSolid = computed(() => {
  const threshold = (route.meta.headerScrollThreshold as number) || 0;
  if (import.meta.server) return threshold <= 0;
  return scrollY.value >= window.innerHeight * threshold;
});
</script>

<template>
  <header
    class="sticky top-0 z-50 h-20 border-b-4 transition-colors duration-300"
    :class="isHeaderSolid ? 'bg-primary-600 border-secondary-600' : 'bg-transparent border-transparent'"
  >
    <UContainer class="h-full flex items-center justify-between">
      <div class="text-neutral-50 text-xl font-bold">
        Clasteria
      </div>

      <nav class="flex gap-2">
        <UButton
          v-for="item in navItems"
          :key="item.label"
          :active="item.active"
          variant="ghost"
          active-variant="solid"
          color="primary"
          size="lg"
          class="h-14 px-4"
          :ui="{
            base: 'text-primary-100 hover:bg-neutral-50/10',
          }"
          active-class="bg-primary-500 text-neutral-50"
        >
          {{ item.label }}
        </UButton>
      </nav>

      <div class="flex items-center gap-4">
        <NuxtLink
          to="#"
          class="text-neutral-50 hover:text-primary-200"
        >
          ログイン
        </NuxtLink>
        <UButton
          color="secondary"
          size="lg"
        >
          登録 / 購入
        </UButton>
        <!-- TODO: ダークモード対応時にテーマ切り替えボタンを復活させる -->
        <!-- <UButton
          :icon="colorModeIcon"
          size="lg"
          variant="ghost"
          square
          :ui="{ base: 'text-white hover:bg-primary-900 focus-visible:ring-primary-400' }"
          @click="toggleColorMode"
        /> -->
      </div>
    </UContainer>
  </header>
</template>
