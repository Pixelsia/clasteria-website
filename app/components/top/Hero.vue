<template>
  <section
    class="relative isolate overflow-hidden bg-neutral-950 text-white"
  >
    <NuxtPicture
      src="/images/clasteria/home-main-visual.png"
      alt=""
      class="absolute inset-0 -z-10 block size-full"
      :img-attrs="{ class: 'size-full object-cover opacity-45' }"
      loading="eager"
    />
    <div class="absolute inset-0 -z-10 bg-gradient-to-b from-neutral-950/70 via-neutral-950/55 to-neutral-950/80" />

    <UContainer class="flex min-h-screen items-center justify-center py-24">
      <div class="site-reveal mx-auto flex max-w-5xl flex-col items-center gap-7 text-center">
        <p class="text-xs font-black uppercase tracking-widest text-primary-300">
          CLASTERIA OFFICIAL
        </p>
        <h1 class="text-5xl font-black leading-tight md:text-7xl">
          遊びから、<br>
          つながる世界へ。<br>
          <span class="text-primary-300">Clasteria</span>
        </h1>
        <p class="max-w-3xl text-lg leading-9 text-neutral-100">
          Minecraft の世界を舞台に、<br>
          新しい体験をつくる Pixelsia のプロジェクト。
        </p>
        <div class="flex flex-wrap justify-center gap-3">
          <UButton
            to="/articles"
            color="primary"
            trailing-icon="i-heroicons-arrow-right"
            size="xl"
          >
            お知らせを見る
          </UButton>
          <UButton
            to="/support"
            color="neutral"
            variant="outline"
            size="xl"
            class="site-glass-action"
          >
            お問い合わせ
          </UButton>
        </div>
        <a
          href="#about"
          class="flex w-fit items-center gap-3 text-sm font-black uppercase tracking-widest text-neutral-200 hover:text-primary-200"
        >
          <UIcon
            name="i-heroicons-chevron-down"
            class="size-5"
          />
          Scroll
        </a>
      </div>
    </UContainer>
  </section>
</template>
