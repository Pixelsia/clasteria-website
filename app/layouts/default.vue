<template>
  <div class="min-h-screen bg-white text-neutral-950">
    <a
      href="#main-content"
      class="sr-only fixed top-2 left-2 z-50 rounded-lg bg-white px-4 py-3 text-primary-700 focus:not-sr-only"
    >本文へスキップ</a>
    <LayoutHeader />
    <UMain
      id="main-content"
      tabindex="-1"
    >
      <slot />
    </UMain>
    <LayoutFooter />
  </div>
</template>
