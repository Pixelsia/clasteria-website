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
  <div>
    <HomeHero
      background-image="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop"
      description="プログラミングとおにごっこを組み合わせた新しい学習体験。自然を感じるこの場所で、あなたのスキルを開花させましょう。"
      primary-button-text="冒険を始める"
      secondary-button-text="詳しく見る"
    >
      <template #title>
        森の中で<span class="text-primary-300">コード</span>を育てよう
      </template>
    </HomeHero>
    <HomeFeatures />
    <HomeNews />
  </div>
</template>
