<script setup lang="ts">
import SiteSectionHeader from '~/components/site/SectionHeader.vue';

const props = defineProps<{ content: Record<string, string> }>();
const items = computed(() => Array.from({ length: 6 }, (_, index) => ({
  label: props.content[`question${index + 1}`] ?? '',
  content: props.content[`answer${index + 1}`] ?? '',
})).filter(item => item.label.trim()));
</script>

<template>
  <UContainer
    as="section"
    data-page-container
    class="site-reveal"
  >
    <SiteSectionHeader
      :eyebrow="content.eyebrow!"
      :title="content.title!"
    />
    <UAccordion
      class="mt-6"
      :items="items"
      :ui="{ label: 'whitespace-pre-line', body: 'whitespace-pre-line' }"
    />
  </UContainer>
</template>
