<script setup lang="ts">
const heroRef = useTemplateRef('hero');
const { y } = useScroll(window, { behavior: 'smooth' });
</script>

<template>
  <section
    ref="hero"
    class="overflow-hidden bg-white"
  >
    <UContainer class="grid min-h-screen gap-12 py-16 md:grid-cols-2 md:items-center">
      <div class="site-reveal site-reveal-left flex flex-col gap-7">
        <p class="text-xs font-black uppercase tracking-widest text-primary-600">
          CLASTERIA OFFICIAL
        </p>
        <h1 class="text-5xl font-black leading-tight text-neutral-950 md:text-7xl">
          遊びと学びが<br>
          同じ世界で<br>
          <span class="text-primary-600">つながる。</span>
        </h1>
        <p class="max-w-xl text-lg leading-9 text-neutral-700">
          Minecraft に Pixelsia の世界を作り、ミニゲームと CodingCraft を通じて自分だけの役割を持てる場所へつなぎます。
        </p>
        <div class="flex flex-wrap gap-3">
          <UButton
            to="/codingcraft"
            color="primary"
            trailing-icon="i-heroicons-arrow-right"
            size="xl"
          >
            CodingCraft
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
        <button
          class="flex w-fit items-center gap-3 text-sm font-black uppercase tracking-widest text-neutral-500 hover:text-primary-700"
          type="button"
          @click="y = heroRef!.offsetTop + heroRef!.offsetHeight"
        >
          <UIcon
            name="i-heroicons-chevron-down"
            class="size-5"
          />
          Scroll
        </button>
      </div>

      <div class="site-reveal site-reveal-right">
        <div class="relative">
          <NuxtPicture
            src="/images/clasteria/home-main-visual.png"
            alt="Clasteria のワールドイメージ"
            class="block aspect-square w-full overflow-hidden rounded-lg"
            :img-attrs="{ class: 'size-full object-cover' }"
            loading="eager"
          />
          <div class="absolute inset-x-6 bottom-6 grid gap-3 md:grid-cols-2">
            <div class="rounded-lg border border-white/30 bg-white/90 p-4 backdrop-blur">
              <p class="text-xs font-black uppercase tracking-widest text-primary-700">
                LEARN
              </p>
              <p class="mt-1 text-sm font-black text-neutral-950">
                CodingCraft
              </p>
            </div>
            <div class="rounded-lg border border-white/30 bg-white/90 p-4 backdrop-blur">
              <p class="text-xs font-black uppercase tracking-widest text-primary-700">
                PLAY
              </p>
              <p class="mt-1 text-sm font-black text-neutral-950">
                Mini Games
              </p>
            </div>
          </div>
        </div>
      </div>
    </UContainer>
  </section>
</template>
