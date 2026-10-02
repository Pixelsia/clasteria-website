<script setup lang="ts">
import { render } from 'vue';
import { createEditorSectionVNode } from '~/composables/editorSection';
import type { Component, Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import { configureHomeEditorCanvas } from '~/utils/editorCanvas';
import HomeSectionView from '~/components/top/HomeSection.vue';
import {
  createDefaultHomeDocument, createHomeSection, homeDraftStorageKey, homePreviewStorageKey, homeFieldLabels,
  homeImages, homeSectionLabels, maxHomeDocumentBytes, maxHomeSections, parseHomeDocument,
  serializeHomeDocument, validateHomeDocument,
} from '~/utils/homeDocument';
import type { HomeDocument, HomeSection, HomeSectionKind } from '~/utils/homeDocument';
import {
  acknowledgeHomeDraftSave, canApplyServerHomeDraft, createHomeDraftClientState, homeDraftRecoveryStorageKey,
  homeDraftRequestTimeoutMs,
  homeDraftResponseError, homeDraftSyncStorageKey, HomeDraftRequestError, isHomeDraftServerDirty,
  parseServerHomeDraftResponse, recordHomeDraftEdit, restoreHomeDraftSyncState, serializeHomeDraftSyncState,
} from '~/utils/homeDraftClient';
import type { ServerHomeDraft } from '~/utils/homeDraftClient';

const appContext = getCurrentInstance()!.appContext;
const canvas = useTemplateRef('canvas');
const blocks = useTemplateRef('blocks');
const layers = useTemplateRef('layers');
const fileInput = useTemplateRef('fileInput');
const selected = shallowRef<HomeSection>();
const sectionList = ref<HomeSection[]>([]);
const ready = ref(false);
const canvasReady = ref(false);
const status = ref('エディターを読み込んでいます…');
const error = ref('');
const canUndo = ref(false);
const canRedo = ref(false);
const resetOpen = ref(false);
const device = ref('Desktop');
const draftState = shallowRef(createHomeDraftClientState(createDefaultHomeDocument()));
const serverBusy = ref<'checking' | 'loading' | 'saving' | null>(null);
const serverStatus = ref('サーバーの下書きを確認します');
const serverError = shallowRef<HomeDraftRequestError>();
const availableServerDraft = shallowRef<ServerHomeDraft | null>(null);
const pendingServerLoad = shallowRef<{ draft: ServerHomeDraft; generation: number }>();
const serverConflict = ref(false);
const invalidDraft = ref(false);
const protectedLocalDraft = ref<string>();
const originalBackup = ref<string>();
let protectedLocalGeneration = 0;
const serverDirty = computed(() => invalidDraft.value || isHomeDraftServerDirty(draftState.value));
const serverSavedAt = computed(() => draftState.value.base
  ? new Date(draftState.value.base.updatedAt).toLocaleString('ja-JP')
  : '');
const saveRequiresLoad = computed(() => {
  const available = availableServerDraft.value;
  const base = draftState.value.base;
  return serverConflict.value || (!!available && (!base || available.revision !== base.revision
    || serializeHomeDocument(available.document) !== serializeHomeDocument(base.document)));
});
let serverRequest: AbortController | undefined;
let editor: Editor | undefined;
let syncing = false;
let disposed = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let canvasTimer: ReturnType<typeof setTimeout> | undefined;
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
    trackDocument();
    const original = protectedLocalDraft.value;
    if (original !== undefined) {
      if (draftState.value.generation === protectedLocalGeneration) {
        status.value = '読み込めない元のバックアップを保持しています。必要に応じて書き出してください';
        return false;
      }
      const recovered = localStorage.getItem(homeDraftRecoveryStorageKey);
      if (recovered !== null && recovered !== original) {
        throw new Error('別の元バックアップが保管されているため、自動保存を停止しました。元のバックアップと現在の下書きを書き出して保管してください。');
      }
      // Preserve the exact unreadable text before replacing the active backup.
      localStorage.setItem(homeDraftRecoveryStorageKey, original);
      originalBackup.value = original;
    }
    localStorage.setItem(homeDraftStorageKey, draftState.value.current);
    protectedLocalDraft.value = undefined;
    status.value = 'このブラウザーに保存済み';
    try {
      localStorage.setItem(homeDraftSyncStorageKey, serializeHomeDraftSyncState(draftState.value));
    }
    catch { status.value = 'このブラウザーに保存済み。次回はサーバーの下書きを読み込み直してください'; }
    return true;
  }
  catch (cause) {
    error.value = protectedLocalDraft.value !== undefined
      ? `元のバックアップを保護するため、自動保存を停止しています。元のバックアップと現在の下書きを書き出してください。${cause instanceof Error ? cause.message : ''}`
      : cause instanceof Error ? cause.message : '保存できませんでした。';
    status.value = '保存できません。下書きを書き出して保管してください';
    return false;
  }
}
function trackDocument() {
  draftState.value = recordHomeDraftEdit(draftState.value, documentFromEditor());
  invalidDraft.value = false;
}
function changed() {
  if (syncing) return;
  updateState();
  try {
    trackDocument();
  }
  catch {
    invalidDraft.value = true;
    draftState.value = { ...draftState.value, generation: draftState.value.generation + 1 };
  }
  status.value = '変更を保存しています…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDraft, 300);
}
function applyDocument(document: HomeDocument, serverDraft?: ServerHomeDraft) {
  if (!editor) return;
  const generation = draftState.value.generation;
  syncing = true;
  editor.setComponents(document.sections.map(section => ({ type: 'clasteria-section', section })));
  editor.UndoManager.clear();
  editor.select(editor.getComponents().at(0));
  syncing = false;
  updateState();
  trackDocument();
  if (draftState.value.generation === generation) {
    draftState.value = { ...draftState.value, generation: generation + 1 };
  }
  if (serverDraft) {
    draftState.value = { ...draftState.value, base: serverDraft };
    availableServerDraft.value = serverDraft;
    serverConflict.value = false;
  }
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
function downloadJson(json: string, filename: string) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadOriginalBackup() {
  if (originalBackup.value === undefined) return;
  try {
    downloadJson(originalBackup.value, 'clasteria-home-original-backup.json');
    status.value = '元のバックアップを書き出しました。ファイルを保管してください';
  }
  catch (cause) { error.value = (cause as Error).message; }
}
function downloadDraft() {
  try {
    downloadJson(serializeHomeDocument(documentFromEditor()), 'clasteria-home-draft.json');
    status.value = '下書きを書き出しました。ファイルを保管してください';
  }
  catch (cause) { error.value = (cause as Error).message; }
}
async function importDraft(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const generation = draftState.value.generation;
  try {
    if (file.size > maxHomeDocumentBytes) throw new Error('下書きファイルは 100 KB 以下にしてください。');
    const document = parseHomeDocument(await file.text());
    if (disposed) return;
    if (!canApplyServerHomeDraft(draftState.value, generation)) {
      throw new Error('読み込み中に編集されたため、JSON の読み込みを中止しました。もう一度ファイルを選択してください。');
    }
    applyDocument(document);
    error.value = '';
    if (saveDraft()) status.value = '下書きを読み込み、このブラウザーに保存しました';
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

async function requestServerDraft(method: 'GET' | 'PUT', body?: { document: HomeDocument; baseRevision: number }) {
  const controller = new AbortController();
  serverRequest = controller;
  const timer = setTimeout(() => controller.abort(), homeDraftRequestTimeoutMs);
  try {
    const response = await fetch('/api/editor/home', {
      method, credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: controller.signal,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw homeDraftResponseError(response.status);
    let result: unknown;
    try {
      result = await response.json();
    }
    catch { throw new HomeDraftRequestError('invalid_response', 'サーバーの応答を確認できませんでした。ログインと保存先の設定を確認してください。'); }
    return parseServerHomeDraftResponse(result);
  }
  catch (cause) {
    if (cause instanceof HomeDraftRequestError) throw cause;
    if (controller.signal.aborted) {
      throw new HomeDraftRequestError('timeout', '通信がタイムアウトしました。保存結果は未確認です。下書きを書き出して保管し、接続を再確認してください。');
    }
    throw new HomeDraftRequestError('network', '通信できませんでした。ネットワークとログイン状態を確認し、もう一度お試しください。現在の編集内容は残っています。');
  }
  finally {
    clearTimeout(timer);
    if (serverRequest === controller) serverRequest = undefined;
  }
}
function reportServerError(cause: unknown) {
  serverError.value = cause instanceof HomeDraftRequestError
    ? cause
    : new HomeDraftRequestError('validation', cause instanceof Error ? cause.message : '下書きを保存できませんでした。');
  if (serverError.value.code === 'conflict') serverConflict.value = true;
}
async function checkServerDraft(allowAutoLoad = false, requestLoad = false) {
  if (!ready.value || serverBusy.value) return;
  serverBusy.value = requestLoad ? 'loading' : 'checking';
  serverError.value = undefined;
  const generation = draftState.value.generation;
  try {
    const draft = await requestServerDraft('GET');
    if (disposed) return;
    availableServerDraft.value = draft;
    // A successful refresh supersedes any older load confirmation.
    pendingServerLoad.value = undefined;
    if (!draft) {
      const hadBaseline = !!draftState.value.base;
      draftState.value = { ...draftState.value, base: null };
      serverConflict.value = false;
      if (hadBaseline) saveDraft();
      serverStatus.value = 'サーバーに下書きはありません。「下書きを保存」で作成できます';
      return;
    }
    if (allowAutoLoad && canApplyServerHomeDraft(draftState.value, generation)) {
      applyDocument(draft.document, draft);
      saveDraft();
      serverStatus.value = 'サーバーの下書きを読み込みました';
    }
    else if (requestLoad) {
      pendingServerLoad.value = { draft, generation: draftState.value.generation };
      serverStatus.value = '読み込む前に、現在の下書きを書き出して保管してください';
    }
    else {
      serverStatus.value = saveRequiresLoad.value
        ? 'サーバーに下書きがあります。現在の編集内容を保管してから読み込んでください'
        : 'サーバーの下書きを確認しました';
    }
  }
  catch (cause) {
    if (!disposed) reportServerError(cause);
  }
  finally { if (!disposed) serverBusy.value = null; }
}
function confirmServerLoad() {
  const pending = pendingServerLoad.value;
  if (!pending || serverBusy.value) return;
  if (!canApplyServerHomeDraft(draftState.value, pending.generation)) {
    pendingServerLoad.value = { ...pending, generation: draftState.value.generation };
    serverStatus.value = '確認中に編集されました。新しい変更も書き出してから、もう一度「置き換えて読み込む」を押してください';
    return;
  }
  applyDocument(pending.draft.document, pending.draft);
  pendingServerLoad.value = undefined;
  serverError.value = undefined;
  saveDraft();
  serverStatus.value = 'サーバーの下書きを読み込みました。公開サイトは変わりません';
}
function cancelServerLoad() {
  pendingServerLoad.value = undefined;
  serverStatus.value = '読み込みをキャンセルしました。現在の編集内容を保持しています';
}
async function saveServerDraft() {
  if (!ready.value || serverBusy.value || pendingServerLoad.value
    || saveRequiresLoad.value || !serverDirty.value) return;
  serverBusy.value = 'saving';
  serverError.value = undefined;
  try {
    trackDocument();
    const submitted = { document: documentFromEditor(), baseRevision: draftState.value.base?.revision ?? 0 };
    const draft = await requestServerDraft('PUT', submitted);
    if (disposed) return;
    if (!draft) throw new HomeDraftRequestError('invalid_response', '保存結果を確認できませんでした。接続を再確認してください。');
    draftState.value = acknowledgeHomeDraftSave(draftState.value, draft, submitted);
    availableServerDraft.value = draft;
    serverConflict.value = false;
    if (protectedLocalDraft.value !== undefined) protectedLocalGeneration = -1;
    saveDraft();
    serverStatus.value = serverDirty.value
      ? '送信した内容を保存しました。その後の変更は、もう一度保存してください'
      : 'サーバーに下書きを保存しました。公開サイトは変わりません';
  }
  catch (cause) {
    if (!disposed) reportServerError(cause);
  }
  finally { if (!disposed) serverBusy.value = null; }
}

onMounted(async () => {
  try {
    const { default: grapesjs } = await import('grapesjs');
    if (disposed || !canvas.value) return;
    editor = grapesjs.init({
      container: canvas.value, height: '100%', width: 'auto', fromElement: false, autorender: false,
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
              const vnode = createEditorSectionVNode(HomeSectionView, section, appContext);
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
    configureHomeEditorCanvas(editor, document);
    editor.on('canvas:frame:load:body', () => {
      canvasReady.value = true;
      clearTimeout(canvasTimer);
    });
    canvasTimer = setTimeout(() => {
      if (!canvasReady.value) error.value = 'キャンバスを表示できませんでした。下書きを書き出してから、ページを再読み込みしてください。';
    }, 10_000);
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
    let hasLocalBackup = false;
    let savedSync: string | null = null;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(homeDraftStorageKey);
      hasLocalBackup = saved !== null;
      if (saved !== null) initial = parseHomeDocument(saved);
      status.value = hasLocalBackup ? 'このブラウザーの下書きを復元しました' : '公開版から開始しました';
    }
    catch {
      hasLocalBackup = true;
      if (saved !== null) {
        protectedLocalDraft.value = saved;
        originalBackup.value = saved;
      }
      error.value = '保存済みの下書きを読み込めませんでした。元のバックアップを保持し、公開版を表示しています。';
    }
    try {
      if (protectedLocalDraft.value === undefined) savedSync = localStorage.getItem(homeDraftSyncStorageKey);
      originalBackup.value ??= localStorage.getItem(homeDraftRecoveryStorageKey) ?? undefined;
    }
    catch { /* Optional recovery metadata must not prevent opening the editor. */ }
    applyDocument(initial);
    protectedLocalGeneration = draftState.value.generation;
    draftState.value = restoreHomeDraftSyncState(draftState.value, savedSync);
    // Register the frame lifecycle handlers before an iframe can start loading.
    editor.render();
    ready.value = true;
    window.addEventListener('pagehide', saveDraft);
    void checkServerDraft(!hasLocalBackup);
  }
  catch { error.value = 'エディターを読み込めませんでした。ページを再読み込みしてください。'; }
});
onBeforeUnmount(() => {
  disposed = true;
  serverRequest?.abort();
  window.removeEventListener('pagehide', saveDraft);
  clearTimeout(saveTimer);
  clearTimeout(canvasTimer);
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
          color="neutral"
          variant="outline"
          :disabled="!ready || !!serverBusy || !!pendingServerLoad"
          :loading="serverBusy === 'loading'"
          @click="checkServerDraft(false, true)"
        >
          サーバーの下書きを読み込む
        </UButton>
        <UButton
          :disabled="!ready || !!serverBusy || !!pendingServerLoad || saveRequiresLoad || !serverDirty"
          :loading="serverBusy === 'saving'"
          @click="saveServerDraft"
        >
          下書きを保存
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
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
      <p>編集中の内容はこのブラウザーに自動保存されます。「下書きを保存」でサーバーにも保存できます。保存・読み込みでは公開サイトは変わりません。JSON でも保管できます。</p>
      <p
        role="status"
        aria-live="polite"
        class="font-bold"
      >
        {{ status }}
      </p>
    </div>
    <section
      class="border-b border-neutral-200 bg-white px-5 py-3 text-sm"
      aria-label="サーバーの下書き保存"
    >
      <div
        role="status"
        aria-live="polite"
      >
        <p class="font-bold">
          {{ serverDirty ? 'サーバーに未保存の変更があります' : 'この内容はサーバーに保存済みです' }}
        </p>
        <p>{{ serverBusy === 'checking' ? 'サーバーの下書きを確認しています…' : serverStatus }}</p>
        <p
          v-if="draftState.base"
          class="mt-1 text-xs text-neutral-600"
        >
          読み込み・保存済みのリビジョン: {{ draftState.base.revision }} / {{ serverSavedAt }}
        </p>
      </div>
      <p
        v-if="saveRequiresLoad && !serverError"
        class="mt-2 text-amber-800"
      >
        サーバーの内容を確認するまで保存できません。必要な変更は JSON に書き出し、サーバーの下書きを読み込んでください。
      </p>
      <div
        v-if="serverError"
        role="alert"
        class="mt-2 text-red-800"
      >
        <p>{{ serverError.message }}</p>
        <div class="mt-2 flex flex-wrap gap-2">
          <UButton
            v-if="['authentication', 'forbidden', 'network', 'invalid_response'].includes(serverError.code)"
            href="/editor"
            target="_blank"
            rel="noopener noreferrer"
            color="neutral"
            variant="outline"
            size="xs"
          >
            別タブでログインを確認
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            :disabled="!!serverBusy"
            @click="checkServerDraft()"
          >
            接続を再確認
          </UButton>
        </div>
      </div>
      <div
        v-if="pendingServerLoad"
        class="mt-3 rounded border border-amber-300 bg-amber-50 p-3"
        role="alertdialog"
        aria-labelledby="server-load-title"
        aria-describedby="server-load-description"
      >
        <h2
          id="server-load-title"
          class="font-bold"
        >
          サーバーの下書きで置き換えますか？
        </h2>
        <p id="server-load-description">
          現在の編集内容とブラウザーの下書きは、リビジョン {{ pendingServerLoad.draft.revision }} の内容に置き換わります。
          残したい変更は、先に「下書き書き出し」で JSON を保管してください。公開サイトは変わりません。
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            @click="downloadDraft"
          >
            下書き書き出し
          </UButton>
          <UButton
            size="sm"
            @click="confirmServerLoad"
          >
            置き換えて読み込む
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            @click="cancelServerLoad"
          >
            キャンセル
          </UButton>
        </div>
      </div>
    </section>
    <div
      v-if="originalBackup !== undefined"
      class="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900"
      role="status"
    >
      <p>読み込めない元のバックアップを保持しています。元のデータは書き出して保管できます。</p>
      <UButton
        class="mt-2"
        color="neutral"
        variant="outline"
        size="sm"
        @click="downloadOriginalBackup"
      >
        元のバックアップを書き出す
      </UButton>
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
            サーバーへの保管は「下書きを保存」を使ってください。プレビューで PC・スマートフォン表示も確認してください。公開には、書き出した JSON をブランチへ取り込み、確認・デプロイする作業が必要です。
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
        <p
          v-if="!canvasReady"
          class="border-b border-neutral-200 bg-white px-4 py-3 text-sm"
          role="status"
        >
          キャンバスを準備しています…
        </p>
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
              @input="changeField(key, ($event.target as HTMLTextAreaElement).value)"
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
