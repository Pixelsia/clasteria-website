<script setup lang="ts">
useSiteReveal();

useSeoMeta({
  title: 'かくれんぼ',
  description: 'Clasteria のかくれんぼの参加、擬態、探索、リザルトまでの流れを紹介します。',
});

const tabs = [
  { label: 'ルール / 遊び方', to: '#rules', icon: 'i-heroicons-list-bullet', active: true },
  { label: 'マップ紹介', to: '#maps', icon: 'i-heroicons-map' },
  { label: 'ランキング', to: '#ranking', icon: 'i-heroicons-trophy' },
];

const maps = [
  {
    label: 'MAP 01',
    title: '緑の迷宮',
    description: '木々が生い茂る視界の悪い迷路です。隠れるポイントが多いステージです。',
    image: '/images/clasteria/clasteria-hero.jpg',
  },
  {
    label: 'MAP 02',
    title: '古びた神殿',
    description: '入り組んだ石造りの通路があるステージです。詳細なギミックは未決です。',
    image: '/images/clasteria/home-main-visual.png',
  },
];
</script>

<template>
  <article>
    <SitePageHero
      eyebrow="KAKURENBO"
      title="かくれんぼ"
      description="かくれんぼは、メインワールドから参加し、待機部屋で人数確認とマップ投票を行ったあと、逃走者がブロックに擬態して隠れ、鬼が制限時間内に捕獲を狙うミニゲームです。"
      image="/images/clasteria/clasteria-hero.jpg"
      image-alt="かくれんぼのイメージ"
      icon="i-heroicons-eye"
    />

    <UContainer
      class="pb-10"
    >
      <SitePageTabs :items="tabs" />
    </UContainer>

    <UContainer
      id="rules"
      as="section"
      class="pb-14 md:pb-20"
    >
      <div class="site-section-card site-reveal p-6 md:p-10">
        <SiteSectionHeader
          eyebrow="FLOW"
          title="待機、投票、擬態、探索"
          description="かくれんぼ README の処理フローに沿って、初期公開の紹介ページで扱う範囲を整理しています。"
        />

        <div class="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SiteInfoCard
            v-for="item in kakurenboFlow"
            :key="item.title"
            :icon="item.icon"
            :title="item.title"
            :body="item.body"
          />
        </div>
      </div>
    </UContainer>

    <section class="bg-green-50">
      <UContainer
        id="maps"
        as="section"
        class="py-14 md:py-20"
      >
        <SiteSectionHeader
          class="site-reveal"
          eyebrow="MAPS"
          title="マップ紹介"
          description="逃走者が隠れる場所と、鬼が探索する場所の見え方をカードで紹介します。詳細なマップ仕様は確定分だけを表示します。"
        />

        <div class="mt-10 grid gap-5 md:grid-cols-2">
          <article
            v-for="map in maps"
            :key="map.title"
            class="site-section-card site-reveal overflow-hidden"
          >
            <NuxtPicture
              :src="map.image"
              :alt="map.title"
              class="block aspect-video overflow-hidden"
              :img-attrs="{ class: 'size-full object-cover' }"
            />
            <div class="p-5">
              <p class="text-xs font-black uppercase tracking-widest text-primary-700">
                {{ map.label }}
              </p>
              <h3 class="mt-2 text-xl font-black text-neutral-950">
                {{ map.title }}
              </h3>
              <p class="mt-3 leading-7 text-neutral-700">
                {{ map.description }}
              </p>
              <UButton
                class="mt-5"
                color="primary"
                variant="outline"
                disabled
                block
              >
                詳細を見る
              </UButton>
            </div>
          </article>
        </div>
      </UContainer>
    </section>

    <UContainer
      id="ranking"
      as="section"
      class="py-14 md:py-20"
    >
      <div class="site-section-card site-reveal flex flex-col items-center p-8 text-center md:p-12">
        <UIcon
          name="i-heroicons-trophy"
          class="size-16 text-yellow-400"
        />
        <p class="mt-5 text-xs font-black uppercase tracking-widest text-primary-700">
          RANKING
        </p>
        <h2 class="mt-3 text-3xl font-black text-neutral-950">
          リーダーボード
        </h2>
        <p class="mt-4 max-w-2xl leading-8 text-neutral-700">
          各ゲーム Top10 の枠へ移動します。データソースと更新方法は未決です。
        </p>
        <UButton
          to="/leaderboard"
          class="mt-7"
          color="primary"
          trailing-icon="i-heroicons-arrow-right"
        >
          ランキングページへ移動
        </UButton>
      </div>
    </UContainer>
  </article>
</template>
