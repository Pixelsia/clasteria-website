<script setup lang="ts">
useSiteReveal();

useSeoMeta({
  title: 'ログイン',
  description: 'Clasteria のログイン機能は初期公開では Coming soon として表示します。',
});
</script>

<template>
  <article>
    <SitePageHero
      eyebrow="LOGIN"
      title="ログイン機能は Coming soon"
      description="README では、ログインは今後実装で、初期公開では飛べるけど Coming soon とする指定があります。ID server、Google ログイン、Minecraft OTP 連携の画面分担は未決です。"
      image="/images/clasteria/home-main-visual.png"
      image-alt="ログイン Coming soon のイメージ"
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
      <SiteTodoNotice
        class="site-reveal"
        title="ログイン関連の未決事項"
        :items="[unresolvedItems[2]]"
      />
    </UContainer>
  </article>
</template>
