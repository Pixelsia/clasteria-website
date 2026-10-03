<script setup lang="ts">
const props = defineProps<{ content: Record<string, string> }>();
const items = computed(() => Array.from({ length: 3 }, (_, index) => ({
  title: props.content[`item${index + 1}Title`] ?? '',
  body: props.content[`item${index + 1}Body`] ?? '',
})));
</script>

<template>
  <UContainer
    as="section"
    data-page-container
  >
    <div class="site-reveal rounded-lg border border-neutral-200 bg-white p-6 text-center md:p-10">
      <p class="whitespace-pre-line text-xs font-black uppercase tracking-widest text-primary-600">
        {{ content.eyebrow }}
      </p>
      <h2 class="whitespace-pre-line mt-3 text-3xl font-black text-neutral-950">
        {{ content.title }}
      </h2>
      <p class="mx-auto mt-4 max-w-3xl whitespace-pre-line leading-8 text-neutral-700">
        {{ content.description }}
      </p>
      <p class="mt-4 text-sm font-bold text-neutral-600">
        準備中の画面です。登録・購入・決済はできません。
      </p>
      <div class="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-3">
        <div
          v-for="(item, index) in items"
          :key="index"
          class="rounded-lg border border-neutral-200 bg-neutral-50 p-5"
        >
          <p class="whitespace-pre-line font-black text-neutral-950">
            {{ item.title }}
          </p>
          <p class="whitespace-pre-line mt-2 text-sm leading-6 text-neutral-600">
            {{ item.body }}
          </p>
        </div>
      </div>
      <UButton
        class="mt-8"
        color="primary"
        type="button"
        disabled
      >
        {{ content.primaryLabel }}
      </UButton>
    </div>
  </UContainer>
</template>
