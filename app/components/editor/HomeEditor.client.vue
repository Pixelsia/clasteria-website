<script setup lang="ts">
import { render } from 'vue';
import { createEditorSectionVNode } from '~/composables/editorSection';
import type { Component, Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import { configureHomeEditorCanvas } from '~/utils/editorCanvas';
import PageSectionView from '~/components/editor/PageSection.vue';
import {
  createDefaultPageDocument, createPageSection, pageFieldLabels,
  pageImages, pageSectionLabels, maxPageDocumentBytes, maxPageSections, parsePageDocument,
  serializePageDocument, validatePageDocument, pageDefinitions, allowedPageSectionKinds,
  pageDestinations, isRequiredPageSection, pageIcons, serializeArticleMarkdown,
} from '~/utils/pageDocument';
import { homeImages } from '~/utils/homeDocument';
import type { PageDocument, PageSection, PageSectionKind, PageId } from '~/utils/pageDocument';
import {
  acknowledgePageDraftSave, canApplyServerPageDraft, createPageDraftClientState, pageStorageKeys,
  pageDraftRequestTimeoutMs, pageDraftResponseError, PageDraftRequestError, isPageDraftServerDirty,
  parseServerPageDraftResponse, recordPageDraftEdit, restorePageDraftSyncState, serializePageDraftSyncState,
} from '~/utils/pageDraftClient';
import type { ServerPageDraft } from '~/utils/pageDraftClient';

const props = withDefaults(defineProps<{ page?: PageId }>(), { page: 'home' });
// The parent keys this component by page. Each page owns requests, history and storage.
const pageId = props.page;
const pageDefinition = pageDefinitions.find(page => page.id === pageId)!;
const storageKeys = pageStorageKeys(pageId);
const availableKinds = allowedPageSectionKinds(pageId).filter(kind => !isRequiredPageSection(kind));
const pendingPageSwitch = ref<PageId>();
let permittedPageSwitch: PageId | undefined;
const appContext = getCurrentInstance()!.appContext;
const canvas = useTemplateRef('canvas');
const blocks = useTemplateRef('blocks');
const layers = useTemplateRef('layers');
const fileInput = useTemplateRef('fileInput');
const noticeToggle = useTemplateRef<HTMLButtonElement>('noticeToggle');
const noticeVisible = ref(true);
const selected = shallowRef<PageSection>();
const sectionList = ref<PageSection[]>([]);
const ready = ref(false);
const canvasReady = ref(false);
const status = ref('エディターを読み込んでいます…');
const error = ref('');
const canUndo = ref(false);
const canRedo = ref(false);
const resetOpen = ref(false);
const device = ref('Desktop');
const draftState = shallowRef(createPageDraftClientState(createDefaultPageDocument(pageId)));
const serverBusy = ref<'checking' | 'loading' | 'saving' | null>(null);
const serverStatus = ref('サーバーの下書きを確認します');
const serverError = shallowRef<PageDraftRequestError>();
const availableServerDraft = shallowRef<ServerPageDraft | null>(null);
const pendingServerLoad = shallowRef<{ draft: ServerPageDraft; generation: number }>();
const serverConflict = ref(false);
const invalidDraft = ref(false);
const protectedLocalDraft = ref<string>();
const originalBackup = ref<string>();
let protectedLocalGeneration = 0;
let localSaveError: string | undefined;
const serverDirty = computed(() => invalidDraft.value || isPageDraftServerDirty(draftState.value));
const serverSavedAt = computed(() => draftState.value.base
  ? new Date(draftState.value.base.updatedAt).toLocaleString('ja-JP')
  : '');
const saveRequiresLoad = computed(() => {
  const available = availableServerDraft.value;
  const base = draftState.value.base;
  return serverConflict.value || (!!available && (!base || available.revision !== base.revision
    || serializePageDocument(available.document) !== serializePageDocument(base.document)));
});
let serverRequest: AbortController | undefined;
let editor: Editor | undefined;
let syncing = false;
let disposed = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let canvasTimer: ReturnType<typeof setTimeout> | undefined;
const destinations = pageDestinations(pageId);
const iconOptions = pageIcons.map(icon => ({ label: icon.replace('i-heroicons-', ''), value: icon }));
const imageOptions = computed(() => pageId === 'home' ? homeImages : pageImages.filter(image => image.value || selected.value?.kind === 'split-content'));
function fixedField(key: string) {
  return (selected.value?.kind === 'article-meta' && ['brand', 'publicationStatus'].includes(key))
    || (selected.value?.kind === 'support-contact' && ['emailLabel', 'emailTo', 'discordTo'].includes(key));
}
function fieldOptions(key: string) {
  if (key === 'image') return imageOptions.value;
  if (key.endsWith('Icon')) return iconOptions;
  return destinations;
}
function downloadArticle() {
  try {
    const current = documentFromEditor();
    const blob = new Blob([serializeArticleMarkdown(current)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${current.sections.find(section => section.kind === 'article-meta')?.content.slug || 'clasteria-article-draft'}.md`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.value = 'Markdown の下書きを書き出しました。公開には内容の確認と別の反映作業が必要です';
  }
  catch (cause) { error.value = (cause as Error).message; }
}
function requestPageSwitch(value: string) {
  if (value === pageId || !pageDefinitions.some(page => page.id === value) || serverBusy.value) return;
  if (serverDirty.value || invalidDraft.value || protectedLocalDraft.value !== undefined) {
    pendingPageSwitch.value = value as PageId;
    return;
  }
  switchPage(value as PageId);
}
function switchPage(page: PageId) {
  if (!pageDefinitions.some(item => item.id === page) || serverBusy.value || !saveDraft()) return;
  pendingPageSwitch.value = undefined;
  permittedPageSwitch = page;
  navigateTo(`/editor?page=${page}`);
}

async function dismissNotice() {
  noticeVisible.value = false;
  await nextTick();
  if (disposed) return;
  editor?.refresh({ tools: true });
  noticeToggle.value?.focus();
}
async function showNotice() {
  noticeVisible.value = true;
  await nextTick();
  if (!disposed) editor?.refresh({ tools: true });
}

function uniqueId() {
  return `section-${crypto.randomUUID()}`;
}
function selectedModel() {
  return editor?.getSelected();
}
function documentFromEditor(): PageDocument {
  return validatePageDocument({ version: 1, page: pageId, sections: editor?.getComponents().map((component: Component) => component.get('section')) ?? [] });
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
      const recovered = localStorage.getItem(storageKeys.recovery);
      if (recovered !== null && recovered !== original) {
        throw new Error('別の元バックアップが保管されているため、自動保存を停止しました。元のバックアップと現在の下書きを書き出して保管してください。');
      }
      // Preserve the exact unreadable text before replacing the active backup.
      localStorage.setItem(storageKeys.recovery, original);
      originalBackup.value = original;
    }
    localStorage.setItem(storageKeys.draft, draftState.value.current);
    protectedLocalDraft.value = undefined;
    status.value = 'このブラウザーに保存済み';
    if (error.value === localSaveError) error.value = '';
    localSaveError = undefined;
    try {
      localStorage.setItem(storageKeys.sync, serializePageDraftSyncState(draftState.value));
    }
    catch { status.value = 'このブラウザーに保存済み。次回はサーバーの下書きを読み込み直してください'; }
    return true;
  }
  catch (cause) {
    error.value = protectedLocalDraft.value !== undefined
      ? `元のバックアップを保護するため、自動保存を停止しています。元のバックアップと現在の下書きを書き出してください。${cause instanceof Error ? cause.message : ''}`
      : cause instanceof Error ? cause.message : '保存できませんでした。';
    localSaveError = error.value;
    status.value = '保存できません。下書きを書き出して保管してください';
    return false;
  }
}
function trackDocument() {
  draftState.value = recordPageDraftEdit(draftState.value, documentFromEditor());
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
function applyDocument(document: PageDocument, serverDraft?: ServerPageDraft) {
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
function addSection(kind: PageSectionKind) {
  if (!editor || sectionList.value.length >= maxPageSections) return;
  const [model] = editor.addComponents({ type: 'clasteria-section', section: createPageSection(kind, uniqueId()) });
  if (model) editor.select(model);
}
function duplicateSection() {
  const model = selectedModel();
  if (!editor || !model || !selected.value || isRequiredPageSection(selected.value.kind)
    || sectionList.value.length >= maxPageSections) return;
  const section = JSON.parse(JSON.stringify(selected.value)) as PageSection;
  section.id = uniqueId();
  const [copy] = editor.addComponents({ type: 'clasteria-section', section }, { at: model.index() + 1 });
  if (copy) editor.select(copy);
}
function protectedSection(section: PageSection) {
  return isRequiredPageSection(section.kind) || sectionList.value.some(item => Object.entries(item.content)
    .some(([key, value]) => key.endsWith('To') && value === `#${section.id}`));
}
function removeSection() {
  if (selected.value && protectedSection(selected.value)) return;
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
    downloadJson(originalBackup.value, `clasteria-${pageId}-original-backup.json`);
    status.value = '元のバックアップを書き出しました。ファイルを保管してください';
  }
  catch (cause) { error.value = (cause as Error).message; }
}
function downloadDraft() {
  try {
    downloadJson(serializePageDocument(documentFromEditor()), `clasteria-${pageId}-draft.json`);
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
    if (file.size > maxPageDocumentBytes) throw new Error('下書きファイルは 100 KB 以下にしてください。');
    const document = parsePageDocument(await file.text());
    if (document.page !== pageId) throw new Error('別のページの下書きです。ページを切り替えてから読み込んでください。');
    if (disposed) return;
    if (!canApplyServerPageDraft(draftState.value, generation)) {
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
    sessionStorage.setItem(storageKeys.preview, serializePageDocument(documentFromEditor()));
    saveDraft();
    navigateTo(`/editor/preview?page=${pageId}`);
  }
  catch (cause) { error.value = `プレビューを開けませんでした: ${(cause as Error).message}`; }
}
function resetDraft() {
  applyDocument(createDefaultPageDocument(pageId));
  error.value = '';
  saveDraft();
  resetOpen.value = false;
}

async function requestServerDraft(method: 'GET' | 'PUT', body?: { document: PageDocument; baseRevision: number }) {
  const controller = new AbortController();
  serverRequest = controller;
  const timer = setTimeout(() => controller.abort(), pageDraftRequestTimeoutMs);
  try {
    const response = await fetch(`/api/editor/${pageId}`, {
      method, credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: controller.signal,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw pageDraftResponseError(response.status);
    let result: unknown;
    try {
      result = await response.json();
    }
    catch { throw new PageDraftRequestError('invalid_response', 'サーバーの応答を確認できませんでした。ログインと保存先の設定を確認してください。'); }
    return parseServerPageDraftResponse(result, pageId);
  }
  catch (cause) {
    if (cause instanceof PageDraftRequestError) throw cause;
    if (controller.signal.aborted) {
      throw new PageDraftRequestError('timeout', '通信がタイムアウトしました。保存結果は未確認です。下書きを書き出して保管し、接続を再確認してください。');
    }
    throw new PageDraftRequestError('network', '通信できませんでした。ネットワークとログイン状態を確認し、もう一度お試しください。現在の編集内容は残っています。');
  }
  finally {
    clearTimeout(timer);
    if (serverRequest === controller) serverRequest = undefined;
  }
}
function reportServerError(cause: unknown) {
  serverError.value = cause instanceof PageDraftRequestError
    ? cause
    : new PageDraftRequestError('validation', cause instanceof Error ? cause.message : '下書きを保存できませんでした。');
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
    if (allowAutoLoad && canApplyServerPageDraft(draftState.value, generation)) {
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
  if (!canApplyServerPageDraft(draftState.value, pending.generation)) {
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
    if (!draft) throw new PageDraftRequestError('invalid_response', '保存結果を確認できませんでした。接続を再確認してください。');
    draftState.value = acknowledgePageDraftSave(draftState.value, draft, submitted);
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

onBeforeRouteUpdate((to) => {
  const target = pageDefinitions.find(page => page.id === to.query.page)?.id ?? 'home';
  if (target === pageId) return;
  if (serverBusy.value || !saveDraft()) return false;
  if (permittedPageSwitch === target) return;
  if (serverDirty.value) {
    pendingPageSwitch.value = target;
    return false;
  }
});
onBeforeRouteLeave(() => {
  // Failed local storage must not silently discard edits on Preview/Back/navigation.
  if (ready.value && (serverBusy.value || !saveDraft())) return false;
});

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
              const section = this.get('section') as PageSection;
              if (!section) return;
              if (section.id === 'new') this.set('section', { ...section, id: uniqueId() });
              this.set('name', pageSectionLabels[section.kind]);
              this.set('removable', !isRequiredPageSection(section.kind) && section.id !== 'how-to-play');
              this.on('change:section', () => this.set('name', pageSectionLabels[(this.get('section') as PageSection).kind]));
            },
          },
          view: {
            init() { this.listenTo(this.model, 'change:section', this.renderSection); },
            onRender() { this.renderSection(); },
            renderSection() {
              const section = this.model.get('section') as PageSection;
              if (!section) return;
              const vnode = createEditorSectionVNode(PageSectionView, section, appContext, pageId);
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
    for (const kind of availableKinds) {
      editor.Blocks.add(kind, {
        label: pageSectionLabels[kind], category: 'このページのセクション',
        content: { type: 'clasteria-section', section: createPageSection(kind, 'new') },
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
      if (editor!.getComponents().length > maxPageSections) {
        component.remove();
        error.value = `セクションは最大 ${maxPageSections} 個です。`;
      }
    });
    editor.on('component:selected component:deselected', updateState);
    editor.on('update', changed);
    let initial = createDefaultPageDocument(pageId);
    let hasLocalBackup = false;
    let savedSync: string | null = null;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(storageKeys.draft);
      hasLocalBackup = saved !== null;
      if (saved !== null) {
        initial = parsePageDocument(saved, pageId);
      }
      status.value = hasLocalBackup ? 'このブラウザーの下書きを復元しました' : '初期デザインから開始しました';
    }
    catch {
      hasLocalBackup = true;
      if (saved !== null) {
        protectedLocalDraft.value = saved;
        originalBackup.value = saved;
      }
      error.value = '保存済みの下書きを読み込めませんでした。元のバックアップを保持し、初期デザインを表示しています。';
    }
    try {
      if (protectedLocalDraft.value === undefined) savedSync = localStorage.getItem(storageKeys.sync);
      originalBackup.value ??= localStorage.getItem(storageKeys.recovery) ?? undefined;
    }
    catch { /* Optional recovery metadata must not prevent opening the editor. */ }
    applyDocument(initial);
    protectedLocalGeneration = draftState.value.generation;
    draftState.value = restorePageDraftSyncState(draftState.value, savedSync);
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
        <label
          for="editor-page"
          class="sr-only"
        >編集するページ</label>
        <select
          id="editor-page"
          class="editor-input my-2"
          :value="pageId"
          :disabled="!ready || !!serverBusy"
          @change="requestPageSwitch(($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="item in pageDefinitions"
            :key="item.id"
            :value="item.id"
          >
            {{ item.label }} · {{ item.published ? '公開済み' : '非公開' }}
          </option>
        </select>
        <p
          class="text-xs font-bold"
          :class="pageDefinition.published ? 'text-primary-700' : 'text-amber-800'"
        >
          {{ pageDefinition.published ? '公開済みページの下書き' : '非公開ページ · 保存しても公開されません' }}
        </p>
        <p class="mt-1 text-xs text-neutral-600">
          {{ pageDefinition.description }}
        </p>
        <h1 class="text-xl font-black">
          {{ pageDefinition.label }} を編集
        </h1>
        <div class="mt-1 flex flex-wrap items-center gap-3 text-xs">
          <span
            role="status"
            :aria-live="noticeVisible ? 'off' : 'polite'"
            class="font-bold"
          >
            {{ serverBusy === 'saving' ? 'サーバーに保存中…' : serverDirty ? 'サーバー未保存' : 'サーバー保存済み' }}
            <span
              v-if="!noticeVisible"
              class="sr-only"
            >{{ serverStatus }}</span>
          </span>
          <button
            ref="noticeToggle"
            type="button"
            aria-controls="editor-save-notice"
            :aria-expanded="noticeVisible"
            class="rounded px-1 py-1 text-neutral-600 underline hover:text-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
            @click="noticeVisible ? dismissNotice() : showNotice()"
          >
            {{ noticeVisible ? '保存の案内を閉じる' : '保存の案内を表示' }}
          </button>
        </div>
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
          v-if="pageId === 'article-draft'"
          color="neutral"
          variant="outline"
          :disabled="!ready"
          @click="downloadArticle"
        >
          記事を Markdown で書き出す
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
          :to="pageDefinition.published ? pageDefinition.path : '/'"
          color="neutral"
          variant="ghost"
        >
          {{ pageDefinition.published ? '公開版に戻る' : '公開サイトへ' }}
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
    <section
      v-if="pendingPageSwitch"
      class="border-b border-amber-300 bg-amber-50 p-4 text-sm"
      role="alertdialog"
      aria-label="ページを切り替える前の確認"
    >
      <p>このページにはサーバーに未保存の内容があります。ブラウザーに保管して切り替えますか？サーバー保存は各ページで行ってください。</p>
      <div class="mt-3 flex gap-2">
        <UButton
          size="sm"
          @click="switchPage(pendingPageSwitch)"
        >
          ブラウザーに保管して切り替え
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          @click="downloadDraft"
        >
          下書き書き出し
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          @click="pendingPageSwitch = undefined"
        >
          キャンセル
        </UButton>
      </div>
    </section>
    <div
      v-if="noticeVisible"
      id="editor-save-notice"
      role="region"
      class="relative"
      aria-label="保存の案内"
    >
      <button
        type="button"
        aria-label="保存の案内を閉じる"
        class="absolute right-3 top-2 z-10 flex h-9 w-9 items-center justify-center rounded text-xl text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
        @click="dismissNotice"
      >
        <span aria-hidden="true">×</span>
      </button>
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
      </section>
    </div>
    <section
      v-if="saveRequiresLoad || serverError || pendingServerLoad"
      class="border-b border-neutral-200 bg-white px-5 py-3 text-sm"
      aria-label="下書き保存の確認・エラー"
    >
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
            v-for="kind in availableKinds"
            :key="kind"
            color="neutral"
            variant="outline"
            size="xs"
            :disabled="!ready || sectionList.length >= maxPageSections"
            @click="addSection(kind)"
          >
            ＋ {{ pageSectionLabels[kind] }}
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
              {{ index + 1 }}. {{ pageSectionLabels[section.kind] }}
            </button>
          </li>
        </ol>
        <details class="mt-6 text-xs leading-6">
          <summary class="cursor-pointer font-bold">
            使い方・公開までの流れ
          </summary>
          <p class="mt-3">
            セクションを選択し、右側で文章・画像・色・余白を変更します。ニュース一覧は公開済みの記事を表示します。「新規記事の下書き」は本文を別に準備する画面です。
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
          初期デザインにリセット
        </UButton>
        <div
          v-if="resetOpen"
          class="mt-3 rounded border border-neutral-300 p-3 text-xs"
          role="alertdialog"
          aria-label="下書きをリセット"
        >
          <p>このブラウザーの下書きを初期デザインに戻します。必要な変更は先に書き出してください。</p>
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
            {{ pageSectionLabels[selected.kind] }}
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
              :disabled="isRequiredPageSection(selected.kind) || sectionList.length >= maxPageSections"
              @click="duplicateSection"
            >
              複製
            </UButton>
            <UButton
              size="xs"
              color="error"
              variant="ghost"
              :disabled="protectedSection(selected)"
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
            >{{ pageFieldLabels[key] ?? key }}</label>
            <select
              v-if="key === 'image' || key.endsWith('To') || key.endsWith('Icon')"
              :id="`editor-field-${key}`"
              class="editor-input"
              :value="value"
              :disabled="fixedField(key)"
              @change="changeField(key, ($event.target as HTMLSelectElement).value)"
            >
              <option
                v-for="option in fieldOptions(key)"
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
              :readonly="fixedField(key)"
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
  padding: 0.75rem 3.5rem 0.75rem 1.25rem;
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
