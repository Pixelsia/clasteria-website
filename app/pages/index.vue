<script setup lang="ts">
useSiteReveal();

useSeoMeta({
  title: 'Home',
  description: 'Clasteria の公式サイト入口。CodingCraft、鬼ごっこ、かくれんぼ、リーダーボードへ案内します。',
});
</script>

<template>
  <article class="-mt-20">
    <TopHero />
    <TopFeatures />
    <TopNews />
  </article>
</template>
