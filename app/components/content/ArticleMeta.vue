<script setup lang="ts">
defineProps<{ content: Record<string, string> }>();
</script>

<template>
  <UContainer
    as="header"
    data-page-container
  >
    <div class="mx-auto max-w-4xl">
      <p class="text-xs font-black uppercase tracking-widest text-primary-600">
        ARTICLE DRAFT
      </p>
      <p class="mt-3 rounded-lg border border-secondary-200 bg-secondary-50 p-4 text-sm leading-7 text-neutral-700">
        新規記事 1 件の下書きプレビューです。公開済みの記事やニュース一覧には反映されません。
      </p>
      <h1 class="mt-8 whitespace-pre-line text-4xl font-black leading-tight text-neutral-950 md:text-5xl">
        {{ content.title }}
      </h1>
      <p class="mt-5 whitespace-pre-line text-lg leading-8 text-neutral-700">
        {{ content.description }}
      </p>
      <dl class="mt-8 grid gap-3 border-t border-neutral-200 pt-6 text-sm text-neutral-600 sm:grid-cols-3">
        <div>
          <dt class="font-bold">
            投稿者
          </dt>
          <dd class="mt-1">
            {{ content.author || '未設定' }}
          </dd>
        </div>
        <div>
          <dt class="font-bold">
            公開日案（予約ではありません）
          </dt>
          <dd class="mt-1">
            {{ content.publishedAt || '未設定' }}
          </dd>
        </div>
        <div>
          <dt class="font-bold">
            スラッグ案
          </dt>
          <dd class="mt-1 break-all">
            {{ content.slug || '未設定' }}
          </dd>
        </div>
      </dl>
      <p class="mt-4 text-sm leading-7 text-neutral-600">
        日付は参考情報です。公開・予約配信は行われません。公開前に時刻とタイムゾーンを確認してください。
      </p>
    </div>
  </UContainer>
</template>
