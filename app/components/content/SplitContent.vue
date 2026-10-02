<script setup lang="ts">
const props = defineProps<{ content: Record<string, string> }>();
const items = computed(() => Array.from({ length: 2 }, (_, index) => ({
  title: props.content[`item${index + 1}Title`] ?? '',
  body: props.content[`item${index + 1}Body`] ?? '',
})).filter(item => item.title.trim()));
</script>

<template>
  <UContainer
    as="section"
    data-page-container
    class="grid gap-10 md:grid-cols-2 md:items-center"
  >
    <div
      v-if="content.image"
      class="site-reveal"
    >
      <NuxtPicture
        :src="content.image"
        :alt="content.imageAlt"
        class="block aspect-video overflow-hidden rounded-lg"
        :img-attrs="{ class: 'size-full object-cover' }"
      />
    </div>
    <div class="site-reveal flex flex-col gap-5">
      <p class="text-xs font-black uppercase tracking-widest text-primary-600">
        {{ content.eyebrow }}
      </p>
      <h2 class="text-3xl font-black leading-tight text-neutral-950 md:text-5xl">
        {{ content.title }}
      </h2>
      <p class="whitespace-pre-line leading-8 text-neutral-700">
        {{ content.description }}
      </p>
      <div
        v-if="content.image && items.length"
        class="grid gap-3 sm:grid-cols-2"
      >
        <div
          v-for="(item, index) in items"
          :key="index"
          class="rounded-lg border border-neutral-200 bg-white p-4"
        >
          <h3 class="font-black text-neutral-950">
            {{ item.title }}
          </h3>
          <p class="mt-2 text-sm leading-7 text-neutral-700">
            {{ item.body }}
          </p>
        </div>
      </div>
    </div>
    <div
      v-if="!content.image && items.length"
      class="site-reveal grid gap-4"
    >
      <div
        v-for="(item, index) in items"
        :key="index"
        class="rounded-lg border border-neutral-200 bg-white p-6"
      >
        <h3 class="text-xl font-black text-neutral-950">
          {{ item.title }}
        </h3>
        <p class="mt-3 leading-7 text-neutral-700">
          {{ item.body }}
        </p>
      </div>
    </div>
  </UContainer>
</template>
