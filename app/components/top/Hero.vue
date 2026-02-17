<script setup lang="ts">
/// 背景の画像 marquee

const images = [
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
];

const NUM_ROWS = 4;
const MIN_IMAGES_PER_ROW = 20;
const EAGER_LOAD_COUNT = 6;

const imageRows = computed(() => {
  const imagesPerRow = Math.ceil(images.length / NUM_ROWS);
  const rows: string[][] = Array.from({ length: NUM_ROWS }, () => []);

  images.forEach((image, index) => {
    const rowIndex = Math.floor(index / imagesPerRow);
    if (rowIndex < NUM_ROWS) {
      rows[rowIndex]?.push(image);
    }
  });

  return rows.map((row) => {
    if (row.length === 0) return [];
    let extended = [...row];
    while (extended.length < MIN_IMAGES_PER_ROW) {
      extended = [...extended, ...row];
    }
    return extended;
  });
});

// 初期表示で見える画像のみ eager ロードし、画面外の画像は遅延ロード
const shouldEagerLoad = (
  rowIndex: number,
  imageIndex: number,
  rowLength: number,
): boolean => {
  const isLtr = rowIndex % 2 === 0;
  if (isLtr) return imageIndex >= rowLength && imageIndex < rowLength + EAGER_LOAD_COUNT;
  else return imageIndex < EAGER_LOAD_COUNT;
};

/// スクロール処理

const heroRef = useTemplateRef('hero');
const { y } = useScroll(window, { behavior: 'smooth' });
</script>

<template>
  <section
    ref="hero"
    class="relative isolate overflow-hidden min-h-screen flex flex-col"
  >
    <div class="relative flex-1 flex items-center bg-primary-600/80 z-10">
      <UContainer>
        <h1 class="text-6xl font-bold text-neutral-50 leading-tight">
          新しい<span class="text-primary-300">創造</span>を、<br>
          ここから
        </h1>
        <div class="flex gap-4 mt-8">
          <UButton
            color="secondary"
            trailing-icon="i-heroicons-arrow-right"
            size="lg"
            class="rounded-full justify-between pl-6 pr-4 py-4"
            to="#"
          >
            冒険を始める
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            size="lg"
            class="text-neutral-50 border-neutral-50/30 bg-neutral-50/10 hover:bg-neutral-50/25 active:bg-neutral-50/40 rounded-full px-8 py-4"
            to="#"
          >
            Clasteria とは
          </UButton>
        </div>
      </UContainer>
    </div>

    <div class="absolute bottom-8 inset-x-0 flex justify-center z-10">
      <UButton
        icon="i-heroicons-chevron-down"
        variant="ghost"
        color="neutral"
        aria-label="次のセクションへスクロール"
        :ui="{
          base: 'size-16 rounded-full flex items-center justify-center text-neutral-50/80 hover:bg-neutral-50/10 active:bg-neutral-50/20 focus:bg-neutral-50/20',
          leadingIcon: 'size-8 animate-bounce mt-2',
        }"
        @click="y = heroRef!.offsetTop + heroRef!.offsetHeight"
      />
    </div>

    <div
      class="absolute inset-0"
      aria-hidden="true"
    >
      <div
        v-for="(row, rowIndex) in imageRows"
        :key="rowIndex"
        :class="[
          'absolute inset-x-0 h-1/4 overflow-hidden',
          ['top-0', 'top-1/4', 'top-1/2', 'top-3/4'][rowIndex]
        ]"
      >
        <div
          :class="[
            'flex h-full w-max',
            rowIndex % 2 === 0 ? 'animate-marquee-ltr' : 'animate-marquee-rtl',
          ]"
        >
          <div
            v-for="(image, imageIndex) in [...row, ...row]"
            :key="`image-${imageIndex}`"
            class="shrink-0 h-full aspect-video overflow-hidden"
          >
            <NuxtPicture
              :src="image"
              class="w-full h-full"
              :img-attrs="{
                class: 'w-full h-full object-cover',
                alt: '',
                loading: shouldEagerLoad(rowIndex, imageIndex, row.length)
                  ? 'eager'
                  : 'lazy',
              }"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 画像セットを 2 回繰り返して配置し、50% (1セット分) 移動することで無限ループを実現 */

@keyframes marquee-ltr {
  0% {
    transform: translateX(-50%);
  }

  100% {
    transform: translateX(0);
  }
}

@keyframes marquee-rtl {
  0% {
    transform: translateX(0);
  }

  100% {
    transform: translateX(-50%);
  }
}

.animate-marquee-ltr {
  animation: marquee-ltr 100s linear infinite;
  will-change: transform;
}

.animate-marquee-rtl {
  animation: marquee-rtl 100s linear infinite;
  will-change: transform;
}
</style>
