<script setup lang="ts">
useSiteReveal();

useSeoMeta({
  title: '購入・登録',
  description: 'Clasteria の購入・登録機能は初期公開では Coming soon として表示します。',
});
</script>

<template>
  <article>
    <SitePageHero
      eyebrow="REGISTER"
      title="購入・登録は Coming soon"
      description="README では、購入・登録は今後実装で、初期公開では飛べるけど Coming soon とする指定があります。プラン、課金状態、支払い方法、サブスクリプション管理の導線は未決です。"
      image="/images/clasteria/clasteria-hero.jpg"
      image-alt="購入・登録 Coming soon のイメージ"
      icon="i-heroicons-shopping-bag"
    >
      <template #actions>
        <UButton
          to="/"
          color="primary"
          size="xl"
        >
          Home へ戻る
        </UButton>
        <UButton
          to="/leaderboard"
          color="neutral"
          variant="outline"
          size="xl"
        >
          リーダーボード
        </UButton>
      </template>
    </SitePageHero>

    <UContainer
      as="section"
      class="pb-14 md:pb-20"
    >
      <div class="site-section-card site-reveal p-6 text-center md:p-10">
        <p class="text-xs font-black uppercase tracking-widest text-primary-600">
          REGISTER FLOW
        </p>
        <h2 class="mt-3 text-3xl font-black text-neutral-950">
          選択して決済へ進む枠
        </h2>
        <p class="mx-auto mt-4 max-w-3xl leading-8 text-neutral-700">
          ワイヤーフレームにある「選択して決済、現状は検討中、できるだけ手順を少なめに」の枠です。プラン、課金状態、支払い方法は未決のため、初期公開では Coming soon として表示します。
        </p>
        <div class="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-3">
          <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-5">
            <p class="font-black text-neutral-950">
              プラン選択
            </p>
            <p class="mt-2 text-sm leading-6 text-neutral-600">
              内容未決
            </p>
          </div>
          <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-5">
            <p class="font-black text-neutral-950">
              アカウント確認
            </p>
            <p class="mt-2 text-sm leading-6 text-neutral-600">
              ID server 未接続
            </p>
          </div>
          <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-5">
            <p class="font-black text-neutral-950">
              決済
            </p>
            <p class="mt-2 text-sm leading-6 text-neutral-600">
              支払い方法未決
            </p>
          </div>
        </div>
      </div>

      <SiteTodoNotice
        class="site-reveal mt-10"
        title="購入・登録関連の未決事項"
        :items="[unresolvedItems[3]]"
      />
    </UContainer>
  </article>
</template>
