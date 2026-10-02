<script setup lang="ts">
import ContentPageDocument from '~/components/content/PageDocument.vue';
import { createDefaultPageDocument } from '~/utils/pageDocument';

const document = createDefaultPageDocument('support');

useSeoMeta({
  title: 'お問い合わせ',
  description: 'Clasteria に関するご質問やご相談は、メールまたは Pixelsia Discord へ。',
});
</script>

<template>
  <ContentPageDocument :document="document" />
</template>
