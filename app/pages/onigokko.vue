<script setup lang="ts">
useSiteReveal();

useSeoMeta({
  title: '鬼ごっこ',
  description: 'Clasteria の鬼ごっこのルール、遊び方、参加からリザルトまでの流れを紹介します。',
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
    description: '木々が生い茂る視界の悪い迷路です。逃走ルートの読み合いを楽しめます。',
    image: '/images/clasteria/minigame.jpg',
  },
  {
    label: 'MAP 02',
    title: '古びた神殿',
    description: '入り組んだ石造りの道を走り抜けるステージです。詳細なギミックは未決です。',
    image: '/images/clasteria/clasteria-hero.jpg',
  },
];
</script>

<template>
  <article>
    <SitePageHero
      eyebrow="ONIGOKKO"
      title="おにごっこ"
      description="鬼ごっこは、Clasteria のメインワールドから参加し、ゲームルール投票とマップ投票で遊び方を決めたあと、鬼役のプレイヤーから制限時間まで逃げ切るミニゲームです。"
      image="/images/clasteria/minigame.jpg"
      image-alt="鬼ごっこのイメージ"
      icon="i-heroicons-bolt"
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
          eyebrow="HOW TO PLAY"
          title="参加から試合終了まで"
          description="鬼ごっこ仕様の overview と spec にある、参加、投票、鬼抽選、試合、リザルトまでの流れを要約しています。"
        />

        <div class="mt-10 grid gap-4 md:grid-cols-3">
          <SiteInfoCard
            v-for="item in onigokkoFlow"
            :key="item.title"
            :icon="item.icon"
            :title="item.title"
            :body="item.body"
          />
        </div>

        <div class="mt-10 border-t border-neutral-200 pt-10">
          <h3 class="text-2xl font-black text-neutral-950">
            5種類のゲームルール
          </h3>
          <p class="mt-3 max-w-3xl leading-8 text-neutral-700">
            代わり鬼、増え鬼、ドロケイ、氷鬼、バナナ鬼は、タッチされた逃走者の扱いと救出手段、終了条件が異なります。
          </p>
          <div class="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <SiteInfoCard
              v-for="item in onigokkoRules"
              :key="item.title"
              :icon="item.icon"
              :title="item.title"
              :body="item.body"
            />
          </div>
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
          description="ゲーム開始前のマップ投票で選ぶ候補を紹介します。詳細仕様が未決の部分は未決と明示します。"
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
