<template>
  <section
    class="site-page-surface"
  >
    <UContainer class="py-12 md:py-16">
      <div class="site-glass-panel site-reveal grid gap-10 rounded-lg p-5 md:grid-cols-2 md:p-8 lg:p-10">
        <div class="flex flex-col justify-center">
          <p class="text-xs font-black uppercase tracking-widest text-primary-700 md:text-sm">
            CLASTERIA OFFICIAL
          </p>
          <h1 class="mt-4 text-4xl font-black leading-tight text-neutral-950 md:text-6xl">
            遊びと学びが<br>
            同じ世界で<br>
            <span class="text-primary-700">つながる。</span>
          </h1>
          <p class="mt-6 text-base leading-8 text-neutral-700 md:text-lg">
            Minecraft に Pixelsia の世界を作り、ミニゲームと CodingCraft を通じて自分だけの役割を持てる場所へつなぎます。
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <UButton
              to="/codingcraft"
              color="primary"
              trailing-icon="i-heroicons-arrow-right"
              size="xl"
            >
              プログラミング
            </UButton>
            <UButton
              to="/onigokko"
              color="neutral"
              variant="outline"
              size="xl"
            >
              ミニゲームを見る
            </UButton>
          </div>
        </div>
        <div class="overflow-hidden rounded-lg border border-white bg-white p-2">
          <NuxtPicture
            src="/images/clasteria/home-main-visual.png"
            alt="Clasteria の中心ワールド"
            class="block aspect-video overflow-hidden rounded-lg"
            :img-attrs="{ class: 'size-full object-cover' }"
            loading="eager"
          />
        </div>
      </div>
    </UContainer>
  </section>
</template>
