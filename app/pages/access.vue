<script setup lang="ts">
import ContentPageDocument from '~/components/content/PageDocument.vue';
import { createDefaultPageDocument } from '~/utils/pageDocument';

const document = createDefaultPageDocument('access');
useSeoMeta({ title: '参加・アクセス', description: 'Clasteria の参加・アクセス情報。接続先や対応環境は準備中です。' });
</script>

<template>
  <ContentPageDocument :document="document" />
</template>
