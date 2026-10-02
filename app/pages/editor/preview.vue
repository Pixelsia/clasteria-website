<script setup lang="ts">
import { createDefaultPageDocument, isPageId, pageDefinitions, parsePageDocument } from '~/utils/pageDocument';
import { pageStorageKeys } from '~/utils/pageDraftClient';
const route = useRoute();
const page = isPageId(route.query.page) ? route.query.page : 'home';
const definition = pageDefinitions.find(item => item.id === page)!;
const previewLabel = definition.published ? '下書きプレビュー' : '非公開ページのプレビュー';
const document = ref(createDefaultPageDocument(page));
const ready = ref(false);
const error = ref('');
useSeoMeta({ title: `${definition.label} 下書きプレビュー`, robots: 'noindex, nofollow' });
definePageMeta({ key: route => route.fullPath });
onMounted(() => {
  try {
    const saved = sessionStorage.getItem(pageStorageKeys(page).preview);
    if (!saved) throw new Error('プレビュー用の下書きがありません。エディターから開いてください。');
    document.value = parsePageDocument(saved, page);
    ready.value = true;
  }
  catch (cause) { error.value = (cause as Error).message; }
});
</script>

<template>
  <div>
    <div class="fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center justify-between gap-3 border-t border-primary-200 bg-white p-4">
      <p class="text-sm font-bold">
        <span>{{ definition.label }} · {{ previewLabel }}</span>
        <span class="block">公開サイトには反映されていません</span>
      </p>
      <div class="flex gap-2">
        <UButton :to="`/editor?page=${page}`">
          編集に戻る
        </UButton><UButton
          v-if="definition.published"
          :to="definition.path"
          color="neutral"
          variant="outline"
        >
          公開版を見る
        </UButton>
      </div>
    </div>
    <EditorPageDocument
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
