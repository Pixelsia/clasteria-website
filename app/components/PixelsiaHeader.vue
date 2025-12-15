<script setup lang="ts">
// Navigation items
const navItems = [
  { label: 'ホーム', active: true },
  { label: 'プログラミング', active: false },
  { label: 'おにごっこ', active: false },
  { label: 'かくれんぼ', active: false },
  { label: 'ランキング', active: false },
  { label: 'サポート', active: false },
  { label: 'ニュース', active: false },
];

// Color mode
const colorMode = useColorMode();

// State to track if client-side hydration is complete
const isHydrated = ref(false);

// Computed icon based on current mode
const colorModeIcon = computed(() => {
  if (!isHydrated.value) {
    return 'i-heroicons-moon-20-solid';
  }
  return colorMode.value === 'dark' ? 'i-heroicons-sun-20-solid' : 'i-heroicons-moon-20-solid';
});

// State for header background on scroll
const hasScrolled = ref(false);

// Get current route to access page meta
const route = useRoute();

// Mark as hydrated after mount
onMounted(() => {
  isHydrated.value = true;

  // ページメタデータからスクロール閾値を取得（デフォルトは 0）
  const pageThreshold = (route.meta.headerScrollThreshold as number) || 0;
  const scrollThreshold = window.innerHeight * pageThreshold;

  const handleScroll = () => {
    hasScrolled.value = window.scrollY > scrollThreshold;
  };

  window.addEventListener('scroll', handleScroll);

  handleScroll();

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
  });
});

// Toggle color mode
const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
};
</script>

<template>
  <header :class="['sticky top-0 z-50 h-20 border-b-4 transition-colors duration-300', hasScrolled ? 'bg-primary-900 dark:bg-neutral-900 border-secondary-600 dark:border-secondary-700' : 'bg-transparent border-transparent']">
    <UContainer class="h-full flex items-center justify-between">
      <div class="text-white dark:text-neutral-100 text-xl font-bold">
        Pixelsia
      </div>

      <nav class="flex gap-2">
        <UButton
          v-for="item in navItems"
          :key="item.label"
          :variant="item.active ? 'solid' : 'ghost'"
          :class="item.active ? 'bg-primary-700 dark:bg-primary-600 text-white' : 'text-primary-100 dark:text-primary-200 hover:bg-primary-800 dark:hover:bg-primary-700'"
          size="lg"
          class="h-14 px-4"
        >
          {{ item.label }}
        </UButton>
      </nav>

      <div class="flex items-center gap-4">
        <a
          href="#"
          class="text-white dark:text-neutral-100 hover:text-primary-200 dark:hover:text-primary-300"
        >ログイン</a>
        <UButton
          color="secondary"
          size="lg"
        >
          登録 / 購入
        </UButton>
        <UButton
          :icon="colorModeIcon"
          size="lg"
          variant="ghost"
          square
          :ui="{ base: 'text-white dark:text-neutral-100 hover:bg-primary-800 dark:hover:bg-primary-700 focus-visible:ring-primary-400' }"
          @click="toggleColorMode"
        />
      </div>
    </UContainer>
  </header>
</template>
