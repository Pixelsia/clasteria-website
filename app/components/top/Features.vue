<template>
  <UContainer
    as="section"
    class="py-16 md:py-20"
  >
    <SiteSectionHeader
      class="site-reveal"
      eyebrow="CONTENTS"
      title="Clasteria の主要コンテンツ"
      description="HP 仕様書のページ構成に沿って、プログラミングコンテンツ、鬼ごっこ、かくれんぼ、リーダーボードへ案内します。"
      align="center"
    />

    <div class="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 md:grid-cols-2">
      <NuxtLink
        v-for="feature in featureCards"
        :key="feature.title"
        :to="feature.to"
        class="site-reveal group grid min-h-80 bg-white transition-colors hover:bg-primary-50 md:grid-cols-2"
      >
        <NuxtPicture
          :src="feature.image"
          :alt="feature.title"
          class="block min-h-56 overflow-hidden md:min-h-full"
          :img-attrs="{ class: 'size-full object-cover transition-transform duration-500 group-hover:scale-105' }"
        />
        <div class="flex grow flex-col justify-center p-6 md:p-8">
          <div class="mb-5 flex items-center gap-3">
            <span class="flex size-11 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <UIcon
                :name="feature.icon"
                class="size-6"
              />
            </span>
            <span class="text-xs font-black uppercase tracking-widest text-primary-600">{{ feature.eyebrow }}</span>
          </div>
          <h3 class="text-2xl font-black text-neutral-950">
            {{ feature.title }}
          </h3>
          <p class="mt-4 grow leading-8 text-neutral-700">
            {{ feature.description }}
          </p>
          <div class="mt-6 flex items-center gap-2 text-sm font-black text-primary-700">
            詳しく見る
            <UIcon
              name="i-heroicons-arrow-right"
              class="size-4"
            />
          </div>
        </div>
      </NuxtLink>
    </div>
  </UContainer>
</template>
