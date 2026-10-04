<script setup lang="ts">
const route = useRoute();
const isMenuOpen = ref(false);
const menuButton = useTemplateRef('menuButton');

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value;
}

function closeMenu() {
  if (!isMenuOpen.value) return;
  isMenuOpen.value = false;
  menuButton.value?.$el?.focus();
}

const isActive = (to: string): boolean => {
  if (to === '/') return route.path === '/';
  return route.path.startsWith(to);
};

watch(() => route.fullPath, () => {
  isMenuOpen.value = false;
});
</script>

<template>
  <header
    class="site-glass-header sticky top-0 z-50"
    @keydown.esc="closeMenu"
  >
    <UContainer class="flex h-20 items-center justify-between gap-4">
      <NuxtLink
        to="/"
        class="inline-flex shrink-0 items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-4"
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

      <nav
        aria-label="メインナビゲーション"
        class="hidden items-center gap-1 lg:flex"
      >
        <NuxtLink
          v-for="item in siteNavItems"
          :key="item.to"
          :to="item.to"
          :external="item.external"
          :target="item.external ? '_blank' : undefined"
          :rel="item.external ? 'noopener noreferrer' : undefined"
          :aria-label="item.external ? `${item.label}（外部サイト・新しいタブ）` : undefined"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          class="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold text-neutral-700 transition-colors hover:bg-primary-50 hover:text-primary-700"
          :class="isActive(item.to) ? 'bg-primary-50 text-primary-700' : ''"
        >
          {{ item.label }}
          <UIcon
            v-if="item.external"
            name="i-heroicons-arrow-up-right"
            class="size-4"
            aria-hidden="true"
          />
        </NuxtLink>
      </nav>

      <UButton
        ref="menuButton"
        class="lg:hidden"
        color="neutral"
        variant="ghost"
        square
        size="lg"
        :aria-label="isMenuOpen ? 'メニューを閉じる' : 'メニューを開く'"
        :aria-expanded="isMenuOpen"
        aria-controls="mobile-navigation"
        @click="toggleMenu"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          class="size-6"
          aria-hidden="true"
        >
          <path
            v-if="isMenuOpen"
            d="M6 6l12 12M6 18 18 6"
          />
          <path
            v-else
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </UButton>
    </UContainer>

    <nav
      v-if="isMenuOpen"
      id="mobile-navigation"
      aria-label="モバイルナビゲーション"
      class="site-glass-menu lg:hidden"
    >
      <UContainer class="grid gap-2 py-4">
        <NuxtLink
          v-for="item in siteNavItems"
          :key="item.to"
          :to="item.to"
          :external="item.external"
          :target="item.external ? '_blank' : undefined"
          :rel="item.external ? 'noopener noreferrer' : undefined"
          :aria-label="item.external ? `${item.label}（外部サイト・新しいタブ）` : undefined"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          class="inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-bold text-neutral-700 hover:bg-primary-50 hover:text-primary-700"
          :class="isActive(item.to) ? 'bg-primary-50 text-primary-700' : ''"
          @click="closeMenu"
        >
          {{ item.label }}
          <span
            v-if="item.external"
            class="text-xs font-normal text-neutral-500"
          >外部サイト</span>
          <UIcon
            v-if="item.external"
            name="i-heroicons-arrow-up-right"
            class="size-4"
            aria-hidden="true"
          />
        </NuxtLink>
      </UContainer>
    </nav>
  </header>
</template>
