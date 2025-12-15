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
    <HomeHero
      :images="[
        'https://picsum.photos/256/256?random=1',
        'https://picsum.photos/256/256?random=2',
        'https://picsum.photos/256/256?random=3',
        'https://picsum.photos/256/256?random=4',
        'https://picsum.photos/256/256?random=5',
        'https://picsum.photos/256/256?random=6',
        'https://picsum.photos/256/256?random=7',
        'https://picsum.photos/256/256?random=8',
        'https://picsum.photos/256/256?random=9',
        'https://picsum.photos/256/256?random=10',
        'https://picsum.photos/256/256?random=11',
        'https://picsum.photos/256/256?random=12',
      ]"
      description="プログラミングとおにごっこを組み合わせた新しい学習体験。自然を感じるこの場所で、あなたのスキルを開花させましょう。"
      primary-button-text="冒険を始める"
      secondary-button-text="詳しく見る"
    >
      <template #title>
        森の中で<br>
        <span class="text-primary-300">コード</span>を育てよう
      </template>
    </HomeHero>
    <HomeFeatures />
    <HomeNews />
  </div>
</template>
