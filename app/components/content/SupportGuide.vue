<script setup lang="ts">
import SiteSectionHeader from '~/components/site/SectionHeader.vue';

defineProps<{ content: Record<string, string> }>();
</script>

<template>
  <UContainer
    as="section"
    data-page-container
  >
    <div class="site-reveal rounded-lg border border-neutral-200 bg-neutral-50 p-6 md:p-10">
      <SiteSectionHeader
        :eyebrow="content.eyebrow!"
        :title="content.title!"
        :description="content.description"
      />
      <ul class="mt-6 grid gap-4 text-neutral-700 md:grid-cols-3">
        <li
          v-for="index in 3"
          :key="index"
          class="rounded-lg border border-neutral-200 bg-white p-5"
        >
          {{ content[`item${index}`] }}
        </li>
      </ul>
      <p class="mt-5 text-sm leading-7 text-neutral-600">
        {{ content.note }}
      </p>
    </div>
  </UContainer>
</template>
