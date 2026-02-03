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
  imageSrc: string;
}[] = [
  {
    icon: 'i-heroicons-code-bracket',
    title: 'プログラミング',
    description: '基礎から応用まで。コードを書いてキャラクターを動かし、課題をクリアしよう。',
    href: '#',
    color: 'blue',
    imageSrc: 'https://picsum.photos/seed/programming/400/400',
  },
  {
    icon: 'i-heroicons-play',
    title: '遊べるミニゲーム',
    description: 'たまにはリフレッシュしましょう。遊べるミニゲームをたくさん用意しています。',
    href: '#',
    color: 'green',
    imageSrc: 'https://picsum.photos/seed/minigame/400/400',
  },
  {
    icon: 'i-heroicons-trophy',
    title: 'ランキング',
    description: 'スコアを競ってリーダーボードの上位を目指そう。友達との対戦も可能。',
    href: '#',
    color: 'yellow',
    imageSrc: 'https://picsum.photos/seed/ranking/400/400',
  },
];
</script>

<template>
  <UContainer as="section">
    <div class="mb-12 text-center">
      <h2 class="text-3xl font-bold text-primary-900">
        楽しく面白く
      </h2>
      <p class="text-primary-600 mt-4">
        学びも遊びも、Clasteria で完結します
      </p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 auto-rows-fr">
      <NuxtLink
        v-for="feature in features"
        :key="feature.title"
        :to="feature.href"
        :class="['relative overflow-hidden rounded-2xl border-2 p-6 flex flex-col group aspect-square', colorStyles[feature.color].border]"
      >
        <NuxtPicture
          :src="feature.imageSrc"
          :alt="feature.title"
          class="absolute inset-0 w-full h-full z-0 transition-transform duration-500 group-hover:scale-110"
          :img-attrs="{ class: 'w-full h-full object-cover' }"
        />
        <div class="absolute inset-0 backdrop-blur-xs group-hover:backdrop-blur-none bg-neutral-50/50 dark:bg-neutral-900/50 z-1 transition-all duration-300" />
        <div :class="['relative z-10 rounded-full w-12 h-12 flex items-center justify-center mb-4', colorStyles[feature.color].iconBg]">
          <UIcon
            :name="feature.icon"
            :class="['size-6', colorStyles[feature.color].iconText]"
          />
        </div>
        <h3 class="relative z-10 text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          {{ feature.title }}
        </h3>
        <p class="relative z-10 text-neutral-900 dark:text-neutral-100 text-base grow">
          {{ feature.description }}
        </p>
      </NuxtLink>
    </div>
  </UContainer>
</template>
