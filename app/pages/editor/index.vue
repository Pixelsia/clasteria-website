<script setup lang="ts">
import { isPageId } from '~/utils/pageDocument';
const route = useRoute();
const page = computed(() => isPageId(route.query.page) ? route.query.page : 'home');
definePageMeta({ layout: false });
useSeoMeta({ title: 'ページエディター', robots: 'noindex, nofollow' });
</script>

<template>
  <ClientOnly>
    <EditorHomeEditor
      :key="page"
      :page="page"
    />
    <template #fallback>
      <p class="p-8">
        エディターを読み込んでいます…
      </p>
    </template>
  </ClientOnly>
</template>
