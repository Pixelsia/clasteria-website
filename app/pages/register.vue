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
      class="py-20"
    >
      <SiteTodoNotice
        class="site-reveal"
        title="購入・登録関連の未決事項"
        :items="[unresolvedItems[3]]"
      />
    </UContainer>
  </article>
</template>
