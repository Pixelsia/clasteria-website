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
  <header class="site-glass-header sticky top-0 z-50 text-white">
    <UContainer class="flex h-16 items-center justify-between gap-4 md:h-20">
      <NuxtLink
        to="/"
        class="site-brand-lockup inline-flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4"
        aria-label="Clasteria Home"
      >
        <NuxtImg
          src="/images/pixelsia_header_logo.png"
          alt="Pixelsia"
          class="h-6 w-auto object-contain md:h-7"
        />
        <span
          class="h-6 w-px bg-neutral-200"
          aria-hidden="true"
        />
        <span class="text-sm font-bold tracking-wide text-neutral-500 md:text-base">Clasteria</span>
      </NuxtLink>

      <nav class="hidden items-center gap-1 xl:flex">
        <NuxtLink
          v-for="item in primaryNavItems"
          :key="item.to"
          :to="item.to"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          class="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-white/10"
          :class="isActive(item.to) ? 'bg-white/15 text-white' : ''"
        >
          <UIcon
            :name="item.icon"
            class="size-4"
          />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="hidden items-center gap-2 xl:flex">
        <UButton
          to="/login"
          color="neutral"
          variant="ghost"
          class="text-white hover:bg-white/10 hover:text-white"
        >
          ログイン
        </UButton>
        <UButton
          to="/register"
          color="secondary"
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
        :ui="{ base: 'text-white hover:bg-white/10 hover:text-white' }"
        :aria-label="isMenuOpen ? 'メニューを閉じる' : 'メニューを開く'"
        @click="isMenuOpen = !isMenuOpen"
      />
    </UContainer>

    <div
      v-if="isMenuOpen"
      class="site-glass-menu xl:hidden"
    >
      <UContainer class="grid gap-2 py-4">
        <NuxtLink
          v-for="item in siteNavItems"
          :key="item.to"
          :to="item.to"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          class="inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
          :class="isActive(item.to) ? 'bg-white/15 text-white' : ''"
        >
          <UIcon
            :name="item.icon"
            class="size-4"
          />
          {{ item.label }}
        </NuxtLink>
      </UContainer>
    </div>
  </header>
</template>
