<script setup lang="ts">
import type { HomeDocument } from '~/utils/homeDocument';
useSiteReveal();
const props = defineProps<{ document: HomeDocument }>();
const aboutId = computed(() => props.document.sections.find(section => section.kind === 'about')?.id);
</script>

<template>
  <article class="-mt-20">
    <TopHomeSection
      v-for="section in document.sections"
      :key="section.id"
      :section="section"
      :about-id="aboutId"
    />
  </article>
</template>
