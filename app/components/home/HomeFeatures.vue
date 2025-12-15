<script setup lang="ts">
const features = [
  {
    icon: 'i-heroicons-code-bracket',
    title: 'プログラミング',
    description: '基礎から応用まで。コードを書いてキャラクターを動かし、課題をクリアしよう。',
    href: '#',
    color: 'primary' as const,
  },
  {
    icon: 'i-heroicons-play',
    title: 'おにごっこ',
    description: '作成したアルゴリズムで対戦！逃げる側と追う側の戦略を競い合おう。',
    href: '#',
    color: 'primary' as const,
  },
  {
    icon: 'i-heroicons-trophy',
    title: 'ランキング',
    description: 'スコアを競ってリーダーボードの上位を目指そう。友達との対戦も可能。',
    href: '#',
    color: 'secondary' as const,
  },
];
</script>

<template>
  <section class="py-20">
    <UContainer>
      <SectionHeading
        title="選べる3つのモード"
        subtitle="目的に合わせて楽しく学べるコンテンツを用意しています"
      />
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <FeatureCard
          v-for="feature in features"
          :key="feature.title"
          :icon="feature.icon"
          :title="feature.title"
          :description="feature.description"
          :href="feature.href"
          :color="feature.color"
        />
      </div>
    </UContainer>
  </section>
</template>
