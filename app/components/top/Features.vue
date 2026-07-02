<template>
  <UContainer
    as="section"
    class="py-20"
  >
    <SiteSectionHeader
      class="site-reveal"
      eyebrow="CONTENTS"
      title="Clasteria の主要コンテンツ"
      description="HP 仕様書のページ構成に沿って、プログラミングコンテンツ、鬼ごっこ、かくれんぼ、リーダーボードへ案内します。"
      align="center"
    />

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 auto-rows-fr">
      <NuxtLink
        v-for="feature in featureCards"
        :key="feature.title"
        :to="feature.to"
        class="site-reveal group mt-12 flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition-colors hover:border-primary-300"
      >
        <NuxtPicture
          :src="feature.image"
          :alt="feature.title"
          class="block aspect-video overflow-hidden"
          :img-attrs="{ class: 'size-full object-cover transition-transform duration-500 group-hover:scale-105' }"
        />
        <div class="flex grow flex-col p-6">
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
