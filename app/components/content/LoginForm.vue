<script setup lang="ts">
defineProps<{ content: Record<string, string> }>();
</script>

<template>
  <UContainer
    as="section"
    data-page-container
  >
    <div class="site-reveal mx-auto max-w-3xl rounded-lg border border-neutral-200 bg-white p-6 md:p-10">
      <p class="whitespace-pre-line text-xs font-black uppercase tracking-widest text-primary-600">
        {{ content.eyebrow }}
      </p>
      <h2 class="whitespace-pre-line mt-3 text-3xl font-black text-neutral-950">
        {{ content.title }}
      </h2>
      <p class="mt-4 whitespace-pre-line leading-8 text-neutral-700">
        {{ content.description }}
      </p>
      <p class="mt-4 text-sm font-bold text-neutral-600">
        準備中の画面です。入力・ログインはできません。
      </p>
      <div class="mt-8 grid gap-4">
        <UInput
          :placeholder="content.emailLabel"
          :aria-label="content.emailLabel"
          type="email"
          disabled
        />
        <UInput
          :placeholder="content.passwordLabel"
          :aria-label="content.passwordLabel"
          type="password"
          disabled
        />
        <UButton
          color="primary"
          type="button"
          disabled
          block
        >
          {{ content.primaryLabel }}
        </UButton>
      </div>
    </div>
  </UContainer>
</template>
