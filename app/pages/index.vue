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
  <div class="-mt-20">
    <TopHero />
    <TopFeatures />
    <TopNews />
  </div>
</template>
