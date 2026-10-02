<script setup lang="ts">
import ContentPageSection from '~/components/content/PageSection.vue';
import type { PageDocument, PageSection } from '~/utils/pageDocument';

defineProps<{ section: PageSection; page?: PageDocument['page']; aboutId?: string }>();
</script>

<template>
  <ContentPageSection
    :section="section"
    :page="page"
    :about-id="aboutId"
  />
</template>
