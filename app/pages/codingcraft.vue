<script setup lang="ts">
useSiteReveal();

useSeoMeta({
  title: 'プログラミングコンテンツ',
  description: 'CodingCraft の概要、遊び方、Web UI との関係を紹介します。',
});
</script>

<template>
  <article>
    <SitePageHero
      eyebrow="CODINGCRAFT"
      title="Minecraft とビジュアルプログラミングで学ぶ"
      description="CodingCraft は、ブロックを用いたビジュアルプログラミングと Minecraft でプログラミングを学習するコンテンツです。コース学習、サンドボックス、サバイバル、対戦モードの候補が仕様に整理されています。"
      image="/images/clasteria/codingcraft.jpg"
      image-alt="CodingCraft のイメージ"
    >
      <template #actions>
        <UButton
          to="/login"
          color="primary"
          trailing-icon="i-heroicons-arrow-right"
          size="xl"
        >
          Web ログインへ
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
        eyebrow="FLOW"
        title="CodingCraft の入口"
        description="Notion 由来の仕様では、MC ログイン、Web ログイン、CodingCraft Lobby のモード選択へ進む流れが整理されています。"
      />

      <div class="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <SiteInfoCard
          v-for="item in codingCraftFlow"
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
        <div class="site-reveal">
          <NuxtPicture
            src="/images/clasteria/home-main-visual.png"
            alt="Clasteria のワールド"
            class="block aspect-video overflow-hidden rounded-lg"
            :img-attrs="{ class: 'size-full object-cover' }"
          />
        </div>
        <div class="site-reveal flex flex-col gap-5">
          <p class="text-xs font-black uppercase tracking-widest text-primary-600">
            WEB UI
          </p>
          <h2 class="text-3xl font-black leading-tight text-neutral-950 md:text-5xl">
            プロジェクトを選び、blocky で組み立てる
          </h2>
          <p class="leading-8 text-neutral-700">
            Web UI 仕様では、OTP を利用した MC アカウントログイン、プロジェクト一覧、blocky を使ったコーディング画面、学習モード時の課題表示が整理されています。実操作の画面詳細は未決です。
          </p>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-lg border border-neutral-200 bg-white p-4">
              <h3 class="font-black text-neutral-950">
                使い方
              </h3>
              <p class="mt-2 text-sm leading-7 text-neutral-700">
                概要ページとして操作の流れだけを案内します。
              </p>
            </div>
            <div class="rounded-lg border border-neutral-200 bg-white p-4">
              <h3 class="font-black text-neutral-950">
                マップコンテンツ
              </h3>
              <p class="mt-2 text-sm leading-7 text-neutral-700">
                詳細なステージ構成は未決のため発明しません。
              </p>
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <SiteCtaBand
      eyebrow="COMING SOON"
      title="ログイン機能は到達可能な Coming soon として扱う"
      description="README ではログインを初期公開時に Coming soon とする指定があります。Web 側ログインへの導線は残し、実送信は行いません。"
      primary-label="ログインへ"
      primary-to="/login"
      secondary-label="リーダーボードへ"
      secondary-to="/leaderboard"
    />
  </article>
</template>
