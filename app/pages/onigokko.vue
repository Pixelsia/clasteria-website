<script setup lang="ts">
useSiteReveal();

useSeoMeta({
  title: '鬼ごっこ',
  description: 'Clasteria の鬼ごっこのルール、遊び方、参加からリザルトまでの流れを紹介します。',
});
</script>

<template>
  <article>
    <SitePageHero
      eyebrow="ONIGOKKO"
      title="投票でルールを決めて、鬼から逃げ切る"
      description="鬼ごっこは、Clasteria のメインワールドから参加し、ゲームルール投票とマップ投票で遊び方を決めたあと、鬼役のプレイヤーから制限時間まで逃げ切るミニゲームです。"
      image="/images/clasteria/minigame.jpg"
      image-alt="鬼ごっこのイメージ"
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
          to="/support"
          color="neutral"
          variant="outline"
          size="xl"
        >
          サポート
        </UButton>
      </template>
    </SitePageHero>

    <UContainer
      as="section"
      class="py-20"
    >
      <SiteSectionHeader
        class="site-reveal"
        eyebrow="HOW TO PLAY"
        title="参加から試合終了まで"
        description="鬼ごっこ仕様の overview と spec にある、参加、投票、鬼抽選、試合、リザルトまでの流れを要約しています。"
      />

      <div class="mt-12 grid gap-6 md:grid-cols-3">
        <SiteInfoCard
          v-for="item in onigokkoFlow"
          :key="item.title"
          class="site-reveal"
          :icon="item.icon"
          :title="item.title"
          :body="item.body"
        />
      </div>
    </UContainer>

    <section class="bg-neutral-50">
      <UContainer
        as="section"
        class="py-20"
      >
        <SiteSectionHeader
          class="site-reveal"
          eyebrow="RULES"
          title="5種類のゲームルール"
          description="代わり鬼、増え鬼、ドロケイ、氷鬼、バナナ鬼は、タッチされた逃走者の扱いと救出手段、終了条件が異なります。"
          align="center"
        />

        <div class="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <SiteInfoCard
            v-for="item in onigokkoRules"
            :key="item.title"
            class="site-reveal"
            :icon="item.icon"
            :title="item.title"
            :body="item.body"
          />
        </div>
      </UContainer>
    </section>

    <SiteCtaBand
      eyebrow="NEXT"
      title="かくれんぼも見る"
      description="同じ Clasteria のミニゲームとして、かくれんぼの参加からリザルトまでの流れも確認できます。"
      primary-label="かくれんぼへ"
      primary-to="/kakurenbo"
      secondary-label="Home へ"
      secondary-to="/"
    />
  </article>
</template>
