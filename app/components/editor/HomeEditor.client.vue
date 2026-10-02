<script setup lang="ts">
import { h, render, Suspense } from 'vue';
import type { Component, Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import HomeSectionView from '~/components/top/HomeSection.vue';
import {
  createDefaultHomeDocument, createHomeSection, homeDraftStorageKey, homePreviewStorageKey, homeFieldLabels,
  homeImages, homeSectionLabels, maxHomeDocumentBytes, maxHomeSections, parseHomeDocument,
  serializeHomeDocument, validateHomeDocument,
} from '~/utils/homeDocument';
import type { HomeDocument, HomeSection, HomeSectionKind } from '~/utils/homeDocument';

const appContext = getCurrentInstance()!.appContext;
const canvas = useTemplateRef('canvas');
const blocks = useTemplateRef('blocks');
const layers = useTemplateRef('layers');
const fileInput = useTemplateRef('fileInput');
const selected = shallowRef<HomeSection>();
const sectionList = ref<HomeSection[]>([]);
const ready = ref(false);
const status = ref('エディターを読み込んでいます…');
const error = ref('');
const canUndo = ref(false);
const canRedo = ref(false);
const resetOpen = ref(false);
const device = ref('Desktop');
let editor: Editor | undefined;
let syncing = false;
let disposed = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
const destinations = [
  { label: 'Home', value: '/' }, { label: 'ニュース', value: '/articles' }, { label: 'お問い合わせ', value: '/support' },
  { label: 'CodingCraft（外部）', value: 'https://codingcraft.pixelsia.net/login' },
  { label: 'Discord（外部）', value: 'https://discord.gg/TwTPa4Yp4h' }, { label: 'サポートメール', value: 'mailto:support@pixelsia.net' },
];

function uniqueId() {
  return `section-${crypto.randomUUID()}`;
}
function selectedModel() {
  return editor?.getSelected();
}
function documentFromEditor(): HomeDocument {
  return validateHomeDocument({ version: 1, page: 'home', sections: editor?.getComponents().map((component: Component) => component.get('section')) ?? [] });
}
function updateState() {
  if (!editor || syncing) return;
  sectionList.value = editor.getComponents().map((component: Component) => component.get('section'));
  selected.value = selectedModel()?.get('section');
  canUndo.value = editor.UndoManager.hasUndo();
  canRedo.value = editor.UndoManager.hasRedo();
}
function saveDraft() {
  if (!editor || syncing) return;
  try {
    localStorage.setItem(homeDraftStorageKey, serializeHomeDocument(documentFromEditor()));
    status.value = 'このブラウザーに保存済み';
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : '保存できませんでした。';
    status.value = '保存できません。下書きを書き出して保管してください';
  }
}
function changed() {
  if (syncing) return;
  updateState();
  status.value = '変更を保存しています…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDraft, 300);
}
function applyDocument(document: HomeDocument) {
  if (!editor) return;
  syncing = true;
  editor.setComponents(document.sections.map(section => ({ type: 'clasteria-section', section })));
  editor.UndoManager.clear();
  editor.select(editor.getComponents().at(0));
  syncing = false;
  updateState();
}
function changeField(key: string, value: string) {
  const model = selectedModel();
  if (!model || !selected.value) return;
  model.set('section', { ...selected.value, content: { ...selected.value.content, [key]: value } });
}
function changeStyle(key: string, value: string) {
  const model = selectedModel();
  if (!model || !selected.value) return;
  model.set('section', { ...selected.value, style: { ...selected.value.style, [key]: value } });
}
function selectSection(id: string) {
  const model = editor?.getComponents().find((component: Component) => component.get('section')?.id === id);
  if (model) {
    editor?.select(model);
    model.getEl()?.scrollIntoView({ block: 'nearest' });
  }
}
function moveSection(offset: number) {
  const model = selectedModel();
  const wrapper = editor?.getWrapper();
  if (!model || !wrapper) return;
  const next = model.index() + offset;
  // GrapesJS uses the pre-removal insertion boundary when moving down.
  if (next >= 0 && next < sectionList.value.length) model.move(wrapper, { at: offset > 0 ? next + 1 : next });
}
function addSection(kind: HomeSectionKind) {
  if (!editor || sectionList.value.length >= maxHomeSections) return;
  const [model] = editor.addComponents({ type: 'clasteria-section', section: createHomeSection(kind, uniqueId()) });
  if (model) editor.select(model);
}
function duplicateSection() {
  const model = selectedModel();
  if (!editor || !model || !selected.value || selected.value.kind === 'hero' || sectionList.value.length >= maxHomeSections) return;
  const section = JSON.parse(JSON.stringify(selected.value)) as HomeSection;
  section.id = uniqueId();
  const [copy] = editor.addComponents({ type: 'clasteria-section', section }, { at: model.index() + 1 });
  if (copy) editor.select(copy);
}
function removeSection() {
  if (selected.value?.kind === 'hero') return;
  selectedModel()?.remove();
  editor?.select(editor.getComponents().at(0));
}
function undo() {
  editor?.UndoManager.undo();
  changed();
}
function redo() {
  editor?.UndoManager.redo();
  changed();
}
function changeDevice(value: string) {
  device.value = value;
  editor?.setDevice(value);
}
function downloadDraft() {
  try {
    const blob = new Blob([serializeHomeDocument(documentFromEditor())], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'clasteria-home-draft.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.value = '下書きを書き出しました。ファイルを保管してください';
  }
  catch (cause) { error.value = (cause as Error).message; }
}
async function importDraft(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > maxHomeDocumentBytes) throw new Error('下書きファイルは 100 KB 以下にしてください。');
    const document = parseHomeDocument(await file.text());
    applyDocument(document);
    error.value = '';
    saveDraft();
    status.value = '下書きを読み込み、このブラウザーに保存しました';
  }
  catch (cause) { error.value = (cause as Error).message; }
  finally { input.value = ''; }
}
function preview() {
  try {
    sessionStorage.setItem(homePreviewStorageKey, serializeHomeDocument(documentFromEditor()));
    navigateTo('/editor/preview');
  }
  catch (cause) { error.value = `プレビューを開けませんでした: ${(cause as Error).message}`; }
}
function resetDraft() {
  applyDocument(createDefaultHomeDocument());
  error.value = '';
  saveDraft();
  resetOpen.value = false;
}

onMounted(async () => {
  try {
    const { default: grapesjs } = await import('grapesjs');
    if (disposed || !canvas.value) return;
    editor = grapesjs.init({
      container: canvas.value, height: '100%', width: 'auto', fromElement: false,
      storageManager: false, telemetry: false, noticeOnUnload: false,
      panels: { defaults: [] },
      blockManager: { appendTo: blocks.value!, custom: false },
      layerManager: { appendTo: layers.value!, showWrapper: false, hidable: false },
      styleManager: { sectors: [] },
      assetManager: { upload: false },
      parser: { optionsHtml: { allowScripts: false, allowUnsafeAttr: false, allowUnsafeAttrValue: false } },
      deviceManager: { devices: [{ id: 'Desktop', name: 'Desktop', width: '' }, { id: 'Mobile', name: 'Mobile', width: '390px', widthMedia: '600px' }] },
      canvas: { styles: Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).map(link => link.href) },
      plugins: [(instance) => {
        instance.DomComponents.addType('clasteria-section', {
          model: {
            defaults: { droppable: false, editable: false, stylable: false, copyable: false, traits: [], draggable: (_source: Component, target: Component) => target.is('wrapper') },
            init() {
              const section = this.get('section') as HomeSection;
              if (!section) return;
              if (section.id === 'new') this.set('section', { ...section, id: uniqueId() });
              this.set('name', homeSectionLabels[section.kind]);
              this.set('removable', section.kind !== 'hero');
              this.on('change:section', () => this.set('name', homeSectionLabels[(this.get('section') as HomeSection).kind]));
            },
          },
          view: {
            init() { this.listenTo(this.model, 'change:section', this.renderSection); },
            onRender() { this.renderSection(); },
            renderSection() {
              const section = this.model.get('section') as HomeSection;
              if (!section) return;
              const vnode = h(Suspense, {}, { default: () => h(HomeSectionView, { section, aboutId: 'about' }) });
              vnode.appContext = appContext;
              render(vnode, this.el);
              this.el.setAttribute('data-editor-section', section.id);
            },
            removed() { render(null, this.el); },
          },
        });
      }],
    });
    editor.getWrapper()?.set({
      droppable: (source: Component) => source.is('clasteria-section'),
      selectable: false,
    });
    // Do not expose the native HTML paste/import or arbitrary component registry.
    editor.Keymaps.remove('core:copy');
    editor.Keymaps.remove('core:paste');
    for (const kind of ['about', 'news', 'contact'] as const) {
      editor.Blocks.add(kind, {
        label: homeSectionLabels[kind], category: '公開済みセクション',
        content: { type: 'clasteria-section', section: createHomeSection(kind, 'new') },
        select: true,
      });
    }
    editor.on('canvas:frame:load', () => {
      const frameDocument = editor!.Canvas.getDocument();
      for (const style of document.querySelectorAll('style')) frameDocument.head.appendChild(style.cloneNode(true));
      const style = frameDocument.createElement('style');
      style.textContent = '[data-editor-section] > * { pointer-events: none; } .site-reveal { transform: none !important; opacity: 1 !important; } body { margin: 0; }';
      frameDocument.head.appendChild(style);
      frameDocument.documentElement.lang = 'ja';
    });
    editor.on('component:add', (component: Component) => {
      if (syncing) return;
      if (editor!.getComponents().length > maxHomeSections) {
        component.remove();
        error.value = `セクションは最大 ${maxHomeSections} 個です。`;
      }
    });
    editor.on('component:selected component:deselected', updateState);
    editor.on('update', changed);
    let initial = createDefaultHomeDocument();
    try {
      const saved = localStorage.getItem(homeDraftStorageKey);
      if (saved) initial = parseHomeDocument(saved);
      status.value = saved ? 'このブラウザーの下書きを復元しました' : '公開版から開始しました';
    }
    catch { error.value = '保存済みの下書きを読み込めませんでした。公開版を表示しています。'; }
    applyDocument(initial);
    ready.value = true;
  }
  catch { error.value = 'エディターを読み込めませんでした。ページを再読み込みしてください。'; }
});
onBeforeUnmount(() => {
  disposed = true;
  clearTimeout(saveTimer);
  if (ready.value) saveDraft();
  editor?.destroy();
});
</script>

<template>
  <div class="home-editor">
    <header class="editor-toolbar">
      <div>
        <p class="text-xs font-bold text-primary-700">
          CLASTERIA / DESIGN
        </p>
        <h1 class="text-xl font-black">
          Home を編集
        </h1>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          color="neutral"
          variant="outline"
          :disabled="!canUndo"
          @click="undo"
        >
          元に戻す
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          :disabled="!canRedo"
          @click="redo"
        >
          やり直す
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          :disabled="!ready"
          @click="fileInput?.click()"
        >
          下書き読み込み
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          :disabled="!ready"
          @click="downloadDraft"
        >
          下書き書き出し
        </UButton>
        <UButton
          :disabled="!ready"
          @click="preview"
        >
          プレビュー
        </UButton>
        <UButton
          to="/"
          color="neutral"
          variant="ghost"
        >
          公開版に戻る
        </UButton>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept="application/json,.json"
        class="hidden"
        aria-label="下書き JSON ファイル"
        @change="importDraft"
      >
    </header>
    <div class="editor-notice">
      <p>下書きはこの端末・このブラウザーだけに自動保存されます。公開サイトは変わりません。別の端末・プレビュー URL へ移す場合は JSON を書き出してください。</p>
      <p
        role="status"
        aria-live="polite"
        class="font-bold"
      >
        {{ status }}
      </p>
    </div>
    <div
      v-if="error"
      role="alert"
      class="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800"
    >
      {{ error }}
    </div>
    <div class="editor-workspace">
      <aside
        class="editor-sidebar"
        aria-label="セクションとレイヤー"
      >
        <h2 class="font-black">
          セクションを追加
        </h2>
        <p class="mt-2 text-xs leading-6 text-neutral-600">
          下のブロックを画面にドラッグ。または追加ボタンを使ってください。
        </p>
        <div
          ref="blocks"
          class="editor-blocks"
        />
        <div class="my-3 flex flex-wrap gap-2">
          <UButton
            v-for="kind in (['about', 'news', 'contact'] as const)"
            :key="kind"
            color="neutral"
            variant="outline"
            size="xs"
            :disabled="!ready || sectionList.length >= maxHomeSections"
            @click="addSection(kind)"
          >
            ＋ {{ homeSectionLabels[kind] }}
          </UButton>
        </div>
        <h2 class="mt-6 font-black">
          レイヤー
        </h2>
        <p class="mt-2 text-xs leading-6 text-neutral-600">
          ドラッグで順序を変更できます。
        </p>
        <div
          ref="layers"
          class="editor-layers"
        />
        <ol
          class="mt-4 space-y-1"
          aria-label="セクション一覧"
        >
          <li
            v-for="(section, index) in sectionList"
            :key="section.id"
          >
            <button
              class="w-full rounded px-2 py-2 text-left text-sm hover:bg-primary-50"
              :class="selected?.id === section.id ? 'bg-primary-50 font-bold text-primary-800' : ''"
              @click="selectSection(section.id)"
            >
              {{ index + 1 }}. {{ homeSectionLabels[section.kind] }}
            </button>
          </li>
        </ol>
        <details class="mt-6 text-xs leading-6">
          <summary class="cursor-pointer font-bold">
            使い方・公開までの流れ
          </summary>
          <p class="mt-3">
            セクションを選択し、右側で文章・画像・色・余白を変更します。ニュース本文は公開済みの記事から表示します。
          </p>
          <p class="mt-3">
            プレビューで PC・スマートフォン表示を確認し、下書きを書き出してください。公開には、その JSON をブランチへ取り込み、確認・デプロイする作業が必要です。
          </p>
          <p class="mt-3">
            機密情報は入力しないでください。共有端末では下書きが残ります。履歴はこの編集画面を開いている間のみ有効です。
          </p>
          <p class="mt-3">
            編集エンジン: <a
              href="/grapesjs-license.txt"
              target="_blank"
              rel="noopener noreferrer"
              class="underline"
            >GrapesJS（BSD-3-Clause）</a>
          </p>
        </details>
        <UButton
          class="mt-5"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="!ready"
          @click="() => { resetOpen = true; }"
        >
          公開版にリセット
        </UButton>
        <div
          v-if="resetOpen"
          class="mt-3 rounded border border-neutral-300 p-3 text-xs"
          role="alertdialog"
          aria-label="下書きをリセット"
        >
          <p>このブラウザーの下書きを公開版に戻します。必要な変更は先に書き出してください。</p>
          <div class="mt-3 flex gap-2">
            <UButton
              size="xs"
              @click="resetDraft"
            >
              リセットする
            </UButton><UButton
              color="neutral"
              variant="outline"
              size="xs"
              @click="() => { resetOpen = false; }"
            >
              キャンセル
            </UButton>
          </div>
        </div>
      </aside>
      <main
        class="editor-stage"
        aria-label="編集キャンバス"
      >
        <div class="editor-devicebar">
          <span class="text-xs font-bold">実際の Vue コンポーネントで表示</span>
          <div class="flex gap-1">
            <UButton
              color="neutral"
              :variant="device === 'Desktop' ? 'solid' : 'ghost'"
              size="xs"
              @click="changeDevice('Desktop')"
            >
              PC
            </UButton>
            <UButton
              color="neutral"
              :variant="device === 'Mobile' ? 'solid' : 'ghost'"
              size="xs"
              @click="changeDevice('Mobile')"
            >
              スマートフォン
            </UButton>
          </div>
        </div>
        <div
          ref="canvas"
          class="editor-canvas"
        />
      </main>
      <aside
        class="editor-sidebar"
        aria-label="選択したセクションの編集"
      >
        <template v-if="selected">
          <h2 class="font-black">
            {{ homeSectionLabels[selected.kind] }}
          </h2>
          <div class="my-4 flex flex-wrap gap-2">
            <UButton
              size="xs"
              color="neutral"
              variant="outline"
              :disabled="sectionList[0]?.id === selected.id"
              @click="moveSection(-1)"
            >
              上へ
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="outline"
              :disabled="sectionList.at(-1)?.id === selected.id"
              @click="moveSection(1)"
            >
              下へ
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="outline"
              :disabled="selected.kind === 'hero' || sectionList.length >= maxHomeSections"
              @click="duplicateSection"
            >
              複製
            </UButton>
            <UButton
              size="xs"
              color="error"
              variant="ghost"
              :disabled="selected.kind === 'hero'"
              @click="removeSection"
            >
              削除
            </UButton>
          </div>
          <div
            v-for="(value, key) in selected.content"
            :key="`${selected.id}-${key}`"
            class="mb-4"
          >
            <label
              :for="`editor-field-${key}`"
              class="mb-1 block text-xs font-bold"
            >{{ homeFieldLabels[key] }}</label>
            <select
              v-if="key === 'image' || key.endsWith('To')"
              :id="`editor-field-${key}`"
              class="editor-input"
              :value="value"
              @change="changeField(key, ($event.target as HTMLSelectElement).value)"
            >
              <option
                v-for="option in key === 'image' ? homeImages : destinations"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
            <textarea
              v-else
              :id="`editor-field-${key}`"
              class="editor-input"
              :rows="['description', 'cardBody', 'title'].includes(key) ? 3 : 2"
              :value="value"
              maxlength="2000"
              @change="changeField(key, ($event.target as HTMLTextAreaElement).value)"
            />
          </div>
          <h3 class="mb-3 mt-6 font-black">
            色と余白
          </h3>
          <label class="mb-3 flex items-center justify-between text-xs font-bold">アクセント色<input
            type="color"
            :value="selected.style.accent"
            aria-label="アクセント色"
            @input="changeStyle('accent', ($event.target as HTMLInputElement).value)"
          ></label>
          <label class="mb-3 flex items-center justify-between text-xs font-bold">背景色<input
            type="color"
            :value="selected.style.background"
            aria-label="背景色"
            @input="changeStyle('background', ($event.target as HTMLInputElement).value)"
          ></label>
          <label
            for="editor-spacing"
            class="mb-1 block text-xs font-bold"
          >上下の余白</label>
          <select
            id="editor-spacing"
            class="editor-input"
            :value="selected.style.spacing"
            @change="changeStyle('spacing', ($event.target as HTMLSelectElement).value)"
          >
            <option value="compact">
              コンパクト
            </option><option value="normal">
              標準
            </option><option value="roomy">
              ゆったり
            </option>
          </select>
          <p class="mt-4 text-xs leading-6 text-neutral-600">
            編集後はプレビューで文字の読みやすさも確認してください。
          </p>
        </template>
        <p
          v-else
          class="text-sm text-neutral-600"
        >
          画面またはレイヤーからセクションを選んでください。
        </p>
      </aside>
    </div>
  </div>
</template>

<style>
.home-editor {
  min-height: 100vh;
  background: #f4f9f4;
  color: #101828;
  }

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  border-bottom: 1px solid #d1d5db;
  background: white;
  padding: 1rem 1.25rem;
  }

.editor-notice {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid #d1d5db;
  padding: 0.75rem 1.25rem;
  font-size: 0.75rem;
  line-height: 1.75;
  }

.editor-workspace {
  display: grid;
  grid-template-columns: 15rem minmax(0, 1fr) 18rem;
  height: calc(100vh - 10rem);
  min-height: 38rem;
  }

.editor-sidebar {
  overflow: auto;
  border-right: 1px solid #d1d5db;
  border-left: 1px solid #d1d5db;
  background: white;
  padding: 1rem;
  }

.editor-stage {
  display: flex;
  min-width: 0;
  flex-direction: column;
  }

.editor-devicebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.75rem;
  }

.editor-canvas {
  flex: 1;
  min-height: 30rem;
  }

.editor-input {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  padding: 0.5rem;
  font-size: 0.8rem;
  line-height: 1.7;
  }

.home-editor .gjs-one-bg {
  background-color: #f4f9f4;
  }

.home-editor .gjs-two-color {
  color: #374151;
  }

.home-editor .gjs-three-bg {
  background-color: #016630;
  }

.home-editor .gjs-four-color {
  color: #016630;
  }

.home-editor .gjs-cv-canvas {
  top: 0;
  width: 100%;
  height: 100%;
  }

.home-editor .gjs-block {
  width: 100%;
  min-height: 3rem;
  margin: 0.3rem 0;
  border: 1px solid #d1d5db;
  box-shadow: none;
  }

.home-editor .gjs-layer {
  background: white;
  }

.home-editor .gjs-layer-title {
  font-size: 0.75rem;
  }

@media (width <= 1100px) {
  .editor-workspace {
  grid-template-columns: 12rem minmax(0, 1fr) 15rem;
  }
}

@media (width <= 800px) {
  .editor-workspace {
  height: auto;
  grid-template-columns: minmax(0, 1fr);
  }

  .editor-stage {
  grid-row: 1;
  height: 70vh;
  min-height: 34rem;
  }

  .editor-sidebar {
  max-height: 36rem;
  border-bottom: 1px solid #d1d5db;
  }

  .editor-notice {
  flex-direction: column;
  gap: 0.25rem;
  }
}
</style>
