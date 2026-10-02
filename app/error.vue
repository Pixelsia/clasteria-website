<script setup lang="ts">
import type { NuxtError } from '#app';

defineProps<{ error: NuxtError }>();

useSeoMeta({ title: 'ページを表示できません', robots: 'noindex' });
</script>

<template>
  <UApp>
    <UContainer
      as="main"
      class="flex min-h-screen flex-col items-center justify-center gap-6 py-20 text-center"
    >
      <p class="text-sm font-black tracking-widest text-primary-700">
        CLASTERIA
      </p>
      <p class="text-7xl font-black text-primary-600">
        {{ error.statusCode }}
      </p>
      <h1 class="text-3xl font-black text-neutral-950">
        {{ error.statusCode === 404 ? 'ページが見つかりませんでした' : 'ページを表示できませんでした' }}
      </h1>
      <p class="max-w-lg leading-8 text-neutral-700">
        お探しのページが見つからない場合は、Home からゲーム情報やお知らせをご覧ください。
      </p>
      <div class="flex flex-wrap justify-center gap-3">
        <UButton
          href="/"
          size="lg"
          external
        >
          Home に戻る
        </UButton>
        <UButton
          href="/support"
          size="lg"
          variant="outline"
          external
        >
          お問い合わせ
        </UButton>
      </div>
    </UContainer>
  </UApp>
</template>
