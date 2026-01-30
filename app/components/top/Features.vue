<script setup lang="ts">
type FeatureColor = 'blue' | 'green' | 'yellow';

const colorStyles: Record<FeatureColor, {
  border: string;
  iconBg: string;
  iconText: string;
}> = {
  blue: {
    border: 'border-blue-200 dark:border-blue-700',
    iconBg: 'bg-blue-100 dark:bg-blue-900',
    iconText: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    border: 'border-green-200 dark:border-green-700',
    iconBg: 'bg-green-100 dark:bg-green-900',
    iconText: 'text-green-600 dark:text-green-400',
  },
  yellow: {
    border: 'border-yellow-200 dark:border-yellow-700',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900',
    iconText: 'text-yellow-600 dark:text-yellow-400',
  },
};

const features: {
  icon: string;
  title: string;
  description: string;
  href: string;
  color: FeatureColor;
}[] = [
  {
    icon: 'i-heroicons-code-bracket',
    title: 'プログラミング',
    description: '基礎から応用まで。コードを書いてキャラクターを動かし、課題をクリアしよう。',
    href: '#',
    color: 'blue',
  },
  {
    icon: 'i-heroicons-play',
    title: '遊べるミニゲーム',
    description: 'たまにはリフレッシュしましょう。遊べるミニゲームをたくさん用意しています。',
    href: '#',
    color: 'green',
  },
  {
    icon: 'i-heroicons-trophy',
    title: 'ランキング',
    description: 'スコアを競ってリーダーボードの上位を目指そう。友達との対戦も可能。',
    href: '#',
    color: 'yellow',
  },
];
</script>

<template>
  <section class="py-20">
    <UContainer>
      <div class="mb-12 text-center">
        <h2 class="text-3xl font-bold text-primary-900">
          楽しく面白く
        </h2>
        <p class="text-primary-600 mt-4">
          学びも遊びも、Pixelsia で完結します
        </p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 md:grid-rows-1">
        <NuxtLink
          v-for="feature in features"
          :key="feature.title"
          :to="feature.href"
          :class="['bg-white dark:bg-neutral-700 rounded-2xl border-2 p-6 h-full flex flex-col transition-transform hover:scale-105', colorStyles[feature.color].border]"
        >
          <div :class="['rounded-full w-12 h-12 flex items-center justify-center mb-4', colorStyles[feature.color].iconBg]">
            <UIcon
              :name="feature.icon"
              :class="['w-6 h-6', colorStyles[feature.color].iconText]"
            />
          </div>
          <h3 class="text-xl font-bold text-primary-900 mb-2">
            {{ feature.title }}
          </h3>
          <p class="text-neutral-600 dark:text-neutral-300 text-base grow">
            {{ feature.description }}
          </p>
        </NuxtLink>
      </div>
    </UContainer>
  </section>
</template>
