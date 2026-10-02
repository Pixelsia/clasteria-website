<script setup lang="ts">
import PageSectionView from '~/components/content/PageSection.vue';
import { useSiteReveal } from '~/composables/siteReveal';
import type { PageDocument } from '~/utils/pageDocument';

const props = defineProps<{ document: PageDocument; editorPreview?: boolean }>();
const aboutId = computed(() => props.document.sections.find(section => section.kind === 'about')?.id);
useSiteReveal();
</script>

<template>
  <article
    :class="{ '-mt-20': document.page === 'home' }"
    :data-document-page="document.page"
  >
    <PageSectionView
      v-for="section in document.sections"
      :key="section.id"
      :section="section"
      :page="document.page"
      :editor-preview="editorPreview"
      :about-id="aboutId"
    />
  </article>
</template>
