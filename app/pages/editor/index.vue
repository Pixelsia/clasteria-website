<script setup lang="ts">
definePageMeta({ layout: false });
useSeoMeta({ title: 'Home エディター', robots: 'noindex, nofollow' });
</script>

<template>
  <ClientOnly>
    <EditorHomeEditor />
    <template #fallback>
      <p class="p-8">
        エディターを読み込んでいます…
      </p>
    </template>
  </ClientOnly>
</template>
