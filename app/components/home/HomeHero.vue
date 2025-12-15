<script setup lang="ts">
interface Props {
  images: string[];
  description: string;
  primaryButtonText: string;
  primaryButtonHref?: string;
  secondaryButtonText: string;
  secondaryButtonHref?: string;
}

const props = withDefaults(defineProps<Props>(), {
  primaryButtonHref: '#',
  secondaryButtonHref: '#',
});

const NUM_ROWS = 4;
const MIN_IMAGES_PER_ROW = 20;
const EAGER_LOAD_COUNT = 6;

const imageRows = computed(() => {
  const imagesPerRow = Math.ceil(props.images.length / NUM_ROWS);
  const rows: string[][] = Array.from({ length: NUM_ROWS }, () => []);

  props.images.forEach((image, index) => {
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
</script>

<template>
  <section class="relative overflow-hidden min-h-screen">
    <div class="absolute inset-0">
      <div
        v-for="(row, rowIndex) in imageRows"
        :key="rowIndex"
        class="absolute left-0 right-0 h-1/4 overflow-hidden"
        :style="{ top: `${rowIndex * 25}%` }"
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
                alt: `background-${imageIndex}`,
                loading: shouldEagerLoad(rowIndex, imageIndex, row.length)
                  ? 'eager'
                  : 'lazy',
              }"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="absolute inset-0 bg-primary-600/80" />

    <div class="absolute inset-0 z-10 flex items-center">
      <UContainer class="w-full">
        <div class="text-left">
          <h1 class="text-6xl font-bold text-white leading-tight">
            <slot name="title" />
          </h1>
          <p class="text-xl text-primary-100 leading-loose mt-6 max-w-2xl text-balance">
            {{ description }}
          </p>
          <div class="flex gap-4 mt-8">
            <UButton
              color="secondary"
              size="lg"
              class="rounded-full px-8 py-3"
              :to="primaryButtonHref"
            >
              {{ primaryButtonText }}
            </UButton>
            <UButton
              variant="outline"
              class="text-white border-white/30 hover:bg-white/10 rounded-full px-8 py-3"
              :to="secondaryButtonHref"
            >
              {{ secondaryButtonText }}
            </UButton>
          </div>
        </div>
      </UContainer>
    </div>

    <div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
      <UIcon
        name="i-heroicons-chevron-down"
        class="w-8 h-8 text-white/70 animate-bounce"
      />
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
