<script setup lang="ts">
import { createDefaultHomeDocument, homePreviewStorageKey, parseHomeDocument } from '~/utils/homeDocument';
const document = ref(createDefaultHomeDocument());
const ready = ref(false);
const error = ref('');
useSeoMeta({ title: 'Home 下書きプレビュー', robots: 'noindex, nofollow' });
onMounted(() => {
  try {
    const saved = sessionStorage.getItem(homePreviewStorageKey);
    if (!saved) throw new Error('プレビュー用の下書きがありません。エディターから開いてください。');
    document.value = parseHomeDocument(saved);
    ready.value = true;
  }
  catch (cause) { error.value = (cause as Error).message; }
});
</script>

<template>
  <div>
    <div class="fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center justify-between gap-3 border-t border-primary-200 bg-white p-4">
      <p class="text-sm font-bold">
        下書きプレビュー · 公開サイトには反映されていません
      </p>
      <div class="flex gap-2">
        <UButton to="/editor">
          編集に戻る
        </UButton><UButton
          to="/"
          color="neutral"
          variant="outline"
        >
          公開版を見る
        </UButton>
      </div>
    </div>
    <TopHomeDocument
      v-if="ready"
      :document="document"
    />
    <p
      v-else
      class="p-8"
      role="status"
    >
      {{ error || '下書きを読み込んでいます…' }}
    </p>
  </div>
</template>
