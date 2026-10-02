<script setup lang="ts">
import ContentPageDocument from '~/components/content/PageDocument.vue';
import type { PageDocument } from '~/utils/pageDocument';

defineProps<{ document: PageDocument }>();
</script>

<template>
  <ContentPageDocument
    :document="document"
    editor-preview
  />
</template>
