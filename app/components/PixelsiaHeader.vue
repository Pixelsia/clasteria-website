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

const isHeaderSolid = ref(false);
const route = useRoute();

onMounted(() => {
  const threshold = (route.meta.headerScrollThreshold as number) || 0;
  const scrollY = window.innerHeight * threshold;

  const updateHeaderState = () => {
    isHeaderSolid.value = window.scrollY > scrollY;
  };

  window.addEventListener('scroll', updateHeaderState);
  updateHeaderState();

  onUnmounted(() => {
    window.removeEventListener('scroll', updateHeaderState);
  });
});
</script>

<template>
  <header
    class="sticky top-0 z-50 h-20 border-b-4 transition-colors duration-300"
    :class="isHeaderSolid ? 'bg-primary-600 border-secondary-600' : 'bg-transparent border-transparent'"
  >
    <UContainer class="h-full flex items-center justify-between">
      <div class="text-white text-xl font-bold">
        Pixelsia
      </div>

      <nav class="flex gap-2">
        <UButton
          v-for="item in navItems"
          :key="item.label"
          :variant="item.active ? 'solid' : 'ghost'"
          :class="item.active ? 'bg-primary-500 text-white' : 'text-primary-100 hover:bg-white/10'"
          size="lg"
          class="h-14 px-4"
        >
          {{ item.label }}
        </UButton>
      </nav>

      <div class="flex items-center gap-4">
        <a
          href="#"
          class="text-white hover:text-primary-200"
        >ログイン</a>
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
