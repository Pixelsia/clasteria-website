<script setup lang="ts">
useSiteReveal();

useSeoMeta({
  title: 'Home',
  description: 'Clasteria の公式サイト入口。CodingCraft、鬼ごっこ、かくれんぼ、リーダーボードへ案内します。',
});
</script>

<template>
  <article>
    <TopHero />
    <TopFeatures />

    <section class="site-hero-bg text-white">
      <UContainer class="grid gap-8 py-20 md:grid-cols-3 md:items-center">
        <div class="site-reveal md:col-span-2">
          <p class="text-xs font-black uppercase tracking-widest text-primary-300">
            WORLD
          </p>
          <h2 class="mt-4 text-3xl font-black leading-tight md:text-5xl">
            自分だけの役割になれる場所
          </h2>
          <p class="mt-5 max-w-3xl leading-8 text-neutral-200">
            Notion の Clasteria 仕様では、Minecraft に Pixelsia の世界を作り、ゲームと学習コンテンツを同じ場所で提供する構想が整理されています。
          </p>
        </div>
        <div class="site-reveal rounded-lg border border-white/15 bg-white/10 p-6">
          <p class="text-sm leading-8 text-neutral-200">
            ログイン、購入・登録、フォーム送信、ランキング連携は未決のため、初期公開では Coming soon または TODO 表示で扱います。
          </p>
        </div>
      </UContainer>
    </section>

    <TopNews />
    <SiteCtaBand
      eyebrow="NEXT"
      title="遊ぶ入口と学ぶ入口を選ぶ"
      description="プログラミングコンテンツ、鬼ごっこ、かくれんぼの紹介ページへ進めます。ログインと購入・登録は Coming soon として到達できる状態です。"
      primary-label="プログラミングへ"
      primary-to="/codingcraft"
      secondary-label="サポートを見る"
      secondary-to="/support"
    />
  </article>
</template>
