<script setup lang="ts">
const { public: { visualEditorEnabled } } = useRuntimeConfig();
const document = createDefaultHomeDocument();

useSeoMeta({
  title: 'Home',
  description: 'Minecraft の世界で、遊びからつながる。Clasteria の紹介、お知らせ、お問い合わせ。',
});
</script>

<template>
  <div>
    <TopHomeDocument :document="document" />
    <UButton
      v-if="visualEditorEnabled"
      to="/editor"
      class="fixed right-4 bottom-4 z-40"
      icon="i-heroicons-pencil-square"
    >
      Home を編集
    </UButton>
  </div>
</template>
