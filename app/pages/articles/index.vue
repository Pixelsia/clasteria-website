<script setup lang="ts">
import ContentPageDocument from '~/components/content/PageDocument.vue';
import { prerenderPublishedArticleRoutes } from '~/composables/articles';
import { createDefaultPageDocument } from '~/utils/pageDocument';

const document = createDefaultPageDocument('articles');

useSeoMeta({
  title: 'ニュース',
  description: 'Clasteria のお知らせをお届けします。',
});

if (import.meta.server) {
  await prerenderPublishedArticleRoutes();
}
</script>

<template>
  <ContentPageDocument :document="document" />
</template>
