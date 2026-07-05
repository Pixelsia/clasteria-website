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
          to="/leaderboard"
          color="primary"
          trailing-icon="i-heroicons-trophy"
          size="xl"
        >
          ランキングを見る
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

    <UContainer
      as="section"
      class="py-20"
    >
      <SiteSectionHeader
        class="site-reveal"
        eyebrow="FLOW"
        title="待機、投票、擬態、探索"
        description="かくれんぼ README の処理フローに沿って、初期公開の紹介ページで扱う範囲を整理しています。"
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
            逃走者と鬼の役割を明確に見せる
          </h2>
          <p class="leading-8 text-neutral-700">
            仕様では、逃走者は擬態、妨害、挑発、ミッションで生存を狙い、鬼は捕獲ツールで探索します。捕獲後は捕獲済み状態、透明、観戦または移動の動線へ進みます。
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
      title="ミニゲームの順位枠へ"
      description="各ゲーム Top10 の枠は用意していますが、データソースと更新方法は未決です。"
      primary-label="リーダーボードへ"
      primary-to="/leaderboard"
      secondary-label="サポートへ"
      secondary-to="/support"
    />
  </article>
</template>
