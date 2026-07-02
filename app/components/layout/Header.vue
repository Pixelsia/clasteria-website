<script setup lang="ts">
const route = useRoute();
const isMenuOpen = ref(false);

const isActive = (to: string): boolean => {
  if (to === '/') return route.path === '/';
  return route.path.startsWith(to);
};

watch(() => route.fullPath, () => {
  isMenuOpen.value = false;
});
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 backdrop-blur">
    <UContainer class="flex h-20 items-center justify-between gap-4">
      <NuxtLink
        to="/"
        class="flex items-center gap-3"
        aria-label="Clasteria Home"
      >
        <NuxtImg
          src="/pixelsia-logo-text.svg"
          alt=""
          class="h-6 w-auto"
        />
        <span class="text-lg font-black tracking-wide text-neutral-950">Clasteria</span>
      </NuxtLink>

      <nav class="hidden items-center gap-1 xl:flex">
        <NuxtLink
          v-for="item in primaryNavItems"
          :key="item.to"
          :to="item.to"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          class="rounded-lg px-3 py-2 text-sm font-bold text-neutral-700 transition-colors hover:bg-primary-50 hover:text-primary-700"
          :class="isActive(item.to) ? 'bg-primary-50 text-primary-700' : ''"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="hidden items-center gap-2 xl:flex">
        <UButton
          to="/login"
          color="neutral"
          variant="ghost"
        >
          ログイン
        </UButton>
        <UButton
          to="/register"
          color="primary"
          trailing-icon="i-heroicons-arrow-right"
        >
          購入・登録
        </UButton>
      </div>

      <UButton
        class="xl:hidden"
        :icon="isMenuOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'"
        color="neutral"
        variant="ghost"
        square
        size="lg"
        :aria-label="isMenuOpen ? 'メニューを閉じる' : 'メニューを開く'"
        @click="isMenuOpen = !isMenuOpen"
      />
    </UContainer>

    <div
      v-if="isMenuOpen"
      class="border-t border-neutral-200 bg-white xl:hidden"
    >
      <UContainer class="grid gap-2 py-4">
        <NuxtLink
          v-for="item in siteNavItems"
          :key="item.to"
          :to="item.to"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          class="rounded-lg px-4 py-3 text-sm font-bold text-neutral-700 hover:bg-primary-50 hover:text-primary-700"
          :class="isActive(item.to) ? 'bg-primary-50 text-primary-700' : ''"
        >
          {{ item.label }}
        </NuxtLink>
      </UContainer>
    </div>
  </header>
</template>
