<script setup lang="ts">
import SiteInfoCard from '~/components/site/InfoCard.vue';
import SiteSectionHeader from '~/components/site/SectionHeader.vue';

const props = defineProps<{ content: Record<string, string> }>();
const items = computed(() => Array.from({ length: 5 }, (_, index) => ({
  title: props.content[`item${index + 1}Title`] ?? '',
  body: props.content[`item${index + 1}Body`] ?? '',
  icon: props.content[`item${index + 1}Icon`] ?? '',
})).filter(item => item.title.trim()));
const gridClasses: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-2 lg:grid-cols-4',
  5: 'md:grid-cols-2 lg:grid-cols-5',
};
const gridClass = computed(() => gridClasses[items.value.length]);
</script>

<template>
  <UContainer
    as="section"
    data-page-container
  >
    <SiteSectionHeader
      class="site-reveal"
      :eyebrow="content.eyebrow!"
      :title="content.title!"
      :description="content.description"
      :align="items.length === 5 ? 'center' : 'left'"
    />
    <div :class="['mt-12 grid gap-6', gridClass]">
      <SiteInfoCard
        v-for="(item, index) in items"
        :key="index"
        class="site-reveal"
        :icon="item.icon"
        :title="item.title"
        :body="item.body"
      />
    </div>
  </UContainer>
</template>
