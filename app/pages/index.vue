<script setup lang="ts">
const document = createDefaultHomeDocument();

useSeoMeta({
  title: 'Home',
  description: 'Minecraft の世界で、遊びからつながる。Clasteria の紹介、お知らせ、お問い合わせ。',
});
</script>

<template>
  <div>
    <TopHomeDocument :document="document" />
  </div>
</template>
