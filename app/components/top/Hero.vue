<script setup lang="ts">
const heroRef = useTemplateRef('hero');
const { y } = useScroll(window, { behavior: 'smooth' });
</script>

<template>
  <section
    ref="hero"
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
          遊びと学びが<br>
          同じ世界で<br>
          <span class="text-primary-300">つながる。</span>
        </h1>
        <p class="max-w-3xl text-lg leading-9 text-neutral-100">
          Minecraft に Pixelsia の世界を作り、ミニゲームと CodingCraft を通じて自分だけの役割を持てる場所へつなぎます。
        </p>
        <div class="flex flex-wrap justify-center gap-3">
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
          class="flex w-fit items-center gap-3 text-sm font-black uppercase tracking-widest text-neutral-200 hover:text-primary-200"
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
    </UContainer>
  </section>
</template>
