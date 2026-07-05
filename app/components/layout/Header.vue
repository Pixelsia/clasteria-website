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
  <header class="site-glass-header sticky top-0 z-50">
    <UContainer class="flex h-16 items-center justify-between gap-4 md:h-20">
      <NuxtLink
        to="/"
        class="site-brand-lockup inline-flex shrink-0 items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-4"
        aria-label="Clasteria Home"
      >
        <NuxtImg
          src="/images/pixelsia_header_logo.png"
          alt="Pixelsia"
          class="h-7 w-auto object-contain md:h-8"
        />
        <span
          class="h-6 w-px bg-neutral-200"
          aria-hidden="true"
        />
        <span class="text-sm font-bold tracking-wide text-neutral-500 md:text-base">Clasteria</span>
      </NuxtLink>

      <nav class="hidden items-center gap-3 lg:flex">
        <NuxtLink
          v-for="item in primaryNavItems"
          :key="item.to"
          :to="item.to"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          class="rounded-lg px-1 py-2 text-sm font-bold text-neutral-700 transition-colors hover:text-primary-700"
          :class="isActive(item.to) ? 'text-primary-700' : ''"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="hidden items-center gap-3 lg:flex">
        <UButton
          to="/login"
          color="neutral"
          variant="ghost"
          class="text-neutral-700 hover:text-primary-700"
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
        class="lg:hidden"
        :icon="isMenuOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'"
        color="neutral"
        variant="ghost"
        square
        size="lg"
        :ui="{ base: 'text-neutral-900 hover:border-primary-300 hover:text-primary-700' }"
        :aria-label="isMenuOpen ? 'メニューを閉じる' : 'メニューを開く'"
        @click="isMenuOpen = !isMenuOpen"
      />
    </UContainer>

    <div
      v-if="isMenuOpen"
      class="site-glass-menu lg:hidden"
    >
      <UContainer class="grid gap-2 py-4">
        <NuxtLink
          v-for="item in siteNavItems"
          :key="item.to"
          :to="item.to"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          class="inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-bold text-neutral-700 hover:bg-slate-50 hover:text-primary-700"
          :class="isActive(item.to) ? 'bg-primary-50 text-primary-800' : ''"
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
