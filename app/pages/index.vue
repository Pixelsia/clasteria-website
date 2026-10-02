<script setup lang="ts">
useSiteReveal();

useSeoMeta({
  title: 'Home',
  description: 'Minecraft の世界で、遊びからつながる。Clasteria の紹介、お知らせ、お問い合わせ。',
});
</script>

<template>
  <article class="-mt-20">
    <TopHero />
    <TopAbout />
    <TopNews />
    <SiteCtaBand
      eyebrow="CONTACT"
      title="知りたいこと、困ったこと。"
      description="ゲームへの参加やご質問、不具合のご報告はこちらから。"
      primary-label="お問い合わせ"
      primary-to="/support"
    />
  </article>
</template>
