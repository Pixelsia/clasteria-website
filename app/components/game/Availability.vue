<template>
  <section class="border-b border-primary-100 bg-primary-50">
    <UContainer class="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="font-bold text-primary-800">
          開発中のゲームをご紹介しています
        </p>
        <p class="mt-1 text-sm leading-7 text-neutral-700">
          ルールや画面は変更される場合があります。参加・開催についてはお問い合わせください。
        </p>
      </div>
      <UButton
        to="/support"
        color="primary"
        variant="outline"
        class="shrink-0 self-start"
        trailing-icon="i-heroicons-arrow-right"
      >
        参加について問い合わせる
      </UButton>
    </UContainer>
  </section>
</template>
