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
    <div class="hidden border-b border-neutral-100 bg-white md:block">
      <UContainer class="flex h-14 items-center gap-3">
        <NuxtLink
          to="/codingcraft"
          class="inline-flex h-10 items-center rounded-lg border border-neutral-300 px-4 text-xs font-black leading-tight text-neutral-700 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
        >
          PC<br>プログラミング
        </NuxtLink>
        <NuxtLink
          to="/leaderboard"
          class="inline-flex h-10 items-center rounded-lg border border-neutral-300 px-4 text-xs font-black leading-tight text-neutral-700 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
        >
          LB<br>リーダーボード
        </NuxtLink>
      </UContainer>
    </div>
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
