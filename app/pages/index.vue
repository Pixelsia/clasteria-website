<script setup lang="ts">
definePageMeta({
  headerScrollThreshold: 0.9,
});

const route = useRoute();

onMounted(() => {
  route.meta.headerScrollThreshold = (window.innerHeight - 80) / window.innerHeight;
});
</script>

<template>
  <article class="-mt-20">
    <TopHero />
    <div><TopFeatures /></div>
    <TopNews />
  </article>
</template>
