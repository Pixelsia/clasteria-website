<script setup lang="ts">
useSiteReveal();

useSeoMeta({
  title: 'かくれんぼ',
  description: 'Clasteria のかくれんぼの参加、擬態、探索、リザルトまでの流れを紹介します。',
});
</script>

<template>
  <article>
    <SitePageHero
      eyebrow="KAKURENBO"
      title="ブロックに擬態し、鬼の探索から隠れる"
      description="かくれんぼは、メインワールドから参加し、待機部屋で人数確認とマップ投票を行ったあと、逃走者がブロックに擬態して隠れ、鬼が制限時間内に捕獲を狙うミニゲームです。"
      image="/images/clasteria/clasteria-hero.jpg"
      image-alt="かくれんぼのイメージ"
    >
      <template #actions>
        <UButton
          to="#how-to-play"
          color="primary"
          trailing-icon="i-heroicons-arrow-down"
          size="xl"
        >
          遊び方を見る
        </UButton>
        <UButton
          to="/onigokko"
          color="neutral"
          variant="outline"
          size="xl"
        >
          鬼ごっこへ
        </UButton>
      </template>
    </SitePageHero>

    <GameAvailability />

    <UContainer
      id="how-to-play"
      as="section"
      class="scroll-mt-24 py-20"
    >
      <SiteSectionHeader
        class="site-reveal"
        eyebrow="FLOW"
        title="予定している遊び方"
        description="風景の一部になるか、小さな違和感を見つけるか。立場が変わると、同じ景色の見え方も変わります。"
      />

      <div class="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <SiteInfoCard
          v-for="item in kakurenboFlow"
          :key="item.title"
          class="site-reveal"
          :icon="item.icon"
          :title="item.title"
          :body="item.body"
        />
      </div>
    </UContainer>

    <section class="bg-neutral-50">
      <UContainer class="grid gap-10 py-20 md:grid-cols-2 md:items-center">
        <div class="site-reveal flex flex-col gap-5">
          <p class="text-xs font-black uppercase tracking-widest text-primary-600">
            PLAYER ACTIONS
          </p>
          <h2 class="text-3xl font-black leading-tight text-neutral-950 md:text-5xl">
            隠れる側も、探す側も。
          </h2>
          <p class="leading-8 text-neutral-700">
            逃走者はブロックに擬態し、見つからない場所を探します。鬼はマップを観察して、風景に隠れた逃走者を探し出します。
          </p>
        </div>
        <div class="site-reveal grid gap-4">
          <div class="rounded-lg border border-neutral-200 bg-white p-6">
            <h3 class="text-xl font-black text-neutral-950">
              逃走者
            </h3>
            <p class="mt-3 leading-7 text-neutral-700">
              擬態ブロックを選び、鬼待機時間中に隠れます。
            </p>
          </div>
          <div class="rounded-lg border border-neutral-200 bg-white p-6">
            <h3 class="text-xl font-black text-neutral-950">
              鬼
            </h3>
            <p class="mt-3 leading-7 text-neutral-700">
              鬼解放後に探索し、制限時間内に捕獲を狙います。
            </p>
          </div>
        </div>
      </UContainer>
    </section>

    <SiteCtaBand
      eyebrow="NEXT"
      title="次は、鬼ごっこの世界へ。"
      description="ルールによって変わる追いかけっこ。仲間を助ける駆け引きも、鬼ごっこの楽しさです。"
      primary-label="鬼ごっこを見る"
      primary-to="/onigokko"
      secondary-label="サポートへ"
      secondary-to="/support"
    />
  </article>
</template>
