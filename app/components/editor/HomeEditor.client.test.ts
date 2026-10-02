import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as documents from '../../utils/homeDocument';
import * as drafts from '../../utils/homeDraftClient';
import type { HomeDocument, HomeSection } from '../../utils/homeDocument';
import type { HomeDraftClientState, HomeDraftRequestError, ServerHomeDraft } from '../../utils/homeDraftClient';

type Ref<T> = { value: T };
type EditorApi = {
  draftState: Ref<HomeDraftClientState>;
  serverBusy: Ref<string | null>;
  serverError: Ref<HomeDraftRequestError | undefined>;
  serverDirty: Ref<boolean>;
  pendingServerLoad: Ref<{ draft: ServerHomeDraft; generation: number } | undefined>;
  serverStatus: Ref<string>;
  status: Ref<string>;
  error: Ref<string>;
  originalBackup: Ref<string | undefined>;
  saveServerDraft: () => Promise<void>;
  checkServerDraft: (automatic?: boolean, load?: boolean) => Promise<void>;
  confirmServerLoad: () => void;
  cancelServerLoad: () => void;
  changeField: (key: string, value: string) => void;
  resetDraft: () => void;
  importDraft: (event: Event) => Promise<void>;
  documentFromEditor: () => HomeDocument;
  downloadOriginalBackup: () => void;
};

type Request = {
  options: RequestInit;
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
};

const source = readFileSync(new URL('./HomeEditor.client.vue', import.meta.url), 'utf8');
const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)![1]!;
const executable = ts.transpileModule(`${script}\nexport const api = {
  draftState, serverBusy, serverError, serverDirty, pendingServerLoad, serverStatus, status, error, originalBackup,
  saveServerDraft, checkServerDraft, confirmServerLoad, cancelServerLoad,
  changeField, resetDraft, importDraft, documentFromEditor, downloadOriginalBackup,
};`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

async function flush() {
  for (let index = 0; index < 20; index++) await Promise.resolve();
}

async function mountEditor(
  local?: HomeDocument,
  baseline?: ServerHomeDraft,
  recovery: { rawLocal?: string; existing?: string; failWrite?: boolean } = {},
) {
  const storage = new Map<string, string>();
  if (local) {
    storage.set(documents.homeDraftStorageKey, documents.serializeHomeDocument(local));
    if (baseline) {
      storage.set(drafts.homeDraftSyncStorageKey, drafts.serializeHomeDraftSyncState({
        ...drafts.createHomeDraftClientState(local), base: baseline,
      }));
    }
  }
  if (recovery.rawLocal !== undefined) storage.set(documents.homeDraftStorageKey, recovery.rawLocal);
  if (recovery.existing !== undefined) storage.set(drafts.homeDraftRecoveryStorageKey, recovery.existing);
  const callbacks = new Map<string, Array<() => void>>();
  const requests: Request[] = [];
  const downloads: Blob[] = [];
  const pageEvents = new Map<string, () => void>();
  let mounted = async () => {};
  let unmounted = () => {};
  const emit = (event: string) => callbacks.get(event)?.forEach(callback => callback());
  const model = (section: HomeSection) => ({
    get: () => section,
    set: (_key: string, next: HomeSection) => {
      section = next;
      emit('update');
    },
  });
  let components: ReturnType<typeof model>[] = [];
  let selected: ReturnType<typeof model> | undefined;
  const editor = {
    getComponents: () => components,
    getSelected: () => selected,
    setComponents: (items: { section: HomeSection }[]) => {
      components = items.map(item => model(item.section));
      emit('update');
    },
    select: (item: ReturnType<typeof model>) => {
      selected = item;
      emit('component:selected');
    },
    on: (events: string, callback: () => void) => {
      events.split(' ').forEach((event) => {
        callbacks.set(event, [...(callbacks.get(event) ?? []), callback]);
      });
    },
    getWrapper: () => ({ set: () => {} }),
    UndoManager: { clear: () => {}, hasUndo: () => false, hasRedo: () => false },
    Keymaps: { remove: () => {} },
    Blocks: { add: () => {} },
    render: () => emit('canvas:frame:load:body'),
    destroy: () => {},
  };
  vi.stubGlobal('document', {
    querySelectorAll: () => [],
    createElement: () => ({ href: '', download: '', click: () => {} }),
  });
  vi.stubGlobal('window', {
    addEventListener: (event: string, callback: () => void) => pageEvents.set(event, callback),
    removeEventListener: (event: string) => pageEvents.delete(event),
  });
  vi.stubGlobal('URL', {
    createObjectURL: (blob: Blob) => {
      downloads.push(blob);
      return 'blob:test';
    },
    revokeObjectURL: () => {},
  });
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (key === drafts.homeDraftRecoveryStorageKey && recovery.failWrite) throw new Error('Quota exceeded');
      storage.set(key, value);
    },
  });
  vi.stubGlobal('fetch', (_url: string, options: RequestInit) => new Promise<Response>((resolve, reject) => {
    requests.push({ options, resolve, reject });
    options.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
  }));
  const ref = <T>(value?: T) => ({ value });
  const bindings = {
    getCurrentInstance: () => ({ appContext: {} }),
    useTemplateRef: () => ref({}),
    shallowRef: ref,
    ref,
    computed: <T>(get: () => T) => ({ get value() { return get(); } }),
    onMounted: (callback: () => Promise<void>) => { mounted = callback; },
    onBeforeUnmount: (callback: () => void) => { unmounted = callback; },
    navigateTo: () => {},
  };
  const modules: Record<string, unknown> = {
    'vue': { render: () => {} },
    'grapesjs': { default: { init: () => editor } },
    'grapesjs/dist/css/grapes.min.css': {},
    '~/utils/homeDocument': documents,
    '~/utils/homeDraftClient': drafts,
    '~/utils/editorCanvas': { configureHomeEditorCanvas: () => {} },
    '~/composables/editorSection': { createEditorSectionVNode: () => {} },
    '~/components/top/HomeSection.vue': {},
  };
  const exported = {} as { api: EditorApi };
  // Exercise the component's actual script, with its editor and browser dependencies isolated.
  const evaluate = new Function('require', 'exports', ...Object.keys(bindings), executable);
  evaluate((name: string) => {
    if (!(name in modules)) throw new Error(`Unexpected import: ${name}`);
    return modules[name];
  }, exported, ...Object.values(bindings));
  await mounted();
  await flush();
  const reply = async (draft: ServerHomeDraft | null, status = 200) => {
    requests.at(-1)!.resolve(new Response(JSON.stringify({ draft }), { status }));
    await flush();
  };
  return {
    api: exported.api, requests, storage, reply, downloads,
    pagehide: () => pageEvents.get('pagehide')?.(), unmount: () => unmounted(),
  };
}

function draft(title = 'サーバーの文章', revision = 1): ServerHomeDraft {
  const document = documents.createDefaultHomeDocument();
  document.sections[0]!.content.title = title;
  return { document, revision, updatedAt: '2026-10-02T17:00:00.000Z' };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Home editor server save/load orchestration', () => {
  it('automatically loads a server draft only when there is no local backup or newer edit', async () => {
    const editor = await mountEditor();
    await editor.reply(draft());
    expect(editor.api.documentFromEditor()).toEqual(draft().document);
    expect(editor.api.serverDirty.value).toBe(false);
    expect(editor.storage.get(documents.homeDraftStorageKey)).toContain('サーバーの文章');
    editor.unmount();
  });

  it('preserves a legacy local draft and requires load confirmation', async () => {
    const local = draft('既存のローカル編集').document;
    const editor = await mountEditor(local);
    await editor.reply(draft());
    expect(editor.api.documentFromEditor()).toEqual(local);
    expect(editor.api.draftState.value.base).toBeNull();
    await editor.api.saveServerDraft();
    expect(editor.requests).toHaveLength(1);
    const load = editor.api.checkServerDraft(false, true);
    await editor.reply(draft());
    await load;
    expect(editor.api.pendingServerLoad.value).toBeDefined();
    editor.api.cancelServerLoad();
    expect(editor.api.documentFromEditor()).toEqual(local);
    editor.unmount();
  });

  it('does not auto-load over edits made while the startup GET is pending', async () => {
    const editor = await mountEditor();
    editor.api.changeField('title', '確認中の編集');
    await editor.reply(draft());
    expect(editor.api.documentFromEditor().sections[0]!.content.title).toBe('確認中の編集');
    expect(editor.api.draftState.value.base).toBeNull();
    editor.unmount();
  });

  it('deduplicates save clicks and retains edits made while a save is pending', async () => {
    const editor = await mountEditor();
    await editor.reply(null);
    editor.api.changeField('title', '送信した文章');
    const save = editor.api.saveServerDraft();
    await editor.api.saveServerDraft();
    expect(editor.requests).toHaveLength(2);
    expect(editor.requests[1]!.options.credentials).toBe('same-origin');
    expect(JSON.parse(String(editor.requests[1]!.options.body)).baseRevision).toBe(0);
    editor.api.changeField('title', '送信後の編集');
    await editor.reply(draft('送信した文章'));
    await save;
    expect(editor.api.documentFromEditor().sections[0]!.content.title).toBe('送信後の編集');
    expect(editor.api.draftState.value.base?.revision).toBe(1);
    expect(editor.api.serverDirty.value).toBe(true);
    const saveNewer = editor.api.saveServerDraft();
    expect(JSON.parse(String(editor.requests[2]!.options.body)).baseRevision).toBe(1);
    await editor.reply(draft('送信後の編集', 2));
    await saveNewer;
    expect(editor.api.serverDirty.value).toBe(false);
    editor.unmount();
  });

  it('preserves edits during load and asks again if the confirmation became stale', async () => {
    const editor = await mountEditor(draft('元の編集').document);
    await editor.reply(draft());
    const load = editor.api.checkServerDraft(false, true);
    await editor.api.checkServerDraft(false, true);
    expect(editor.requests).toHaveLength(2);
    editor.api.changeField('title', '読み込み中の編集');
    await editor.reply(draft());
    await load;
    expect(editor.api.documentFromEditor().sections[0]!.content.title).toBe('読み込み中の編集');
    editor.api.changeField('title', '確認画面での編集');
    editor.api.confirmServerLoad();
    expect(editor.api.documentFromEditor().sections[0]!.content.title).toBe('確認画面での編集');
    expect(editor.api.pendingServerLoad.value).toBeDefined();
    editor.api.confirmServerLoad();
    expect(editor.api.documentFromEditor()).toEqual(draft().document);
    expect(editor.api.serverDirty.value).toBe(false);
    editor.unmount();
  });

  it('does not adopt a conflicting revision or overwrite automatically after reconnect', async () => {
    const editor = await mountEditor();
    await editor.reply(draft());
    editor.api.changeField('title', 'ローカルの変更');
    const save = editor.api.saveServerDraft();
    await editor.reply(null, 409);
    await save;
    expect(editor.api.serverError.value?.code).toBe('conflict');
    expect(editor.api.draftState.value.base?.revision).toBe(1);
    const reconnect = editor.api.checkServerDraft();
    await editor.reply(draft('他の編集', 2));
    await reconnect;
    await editor.api.saveServerDraft();
    expect(editor.requests).toHaveLength(3);
    expect(editor.api.draftState.value.base?.revision).toBe(1);
    expect(editor.api.documentFromEditor().sections[0]!.content.title).toBe('ローカルの変更');
    editor.unmount();
  });

  it('clears a stale local baseline when an authenticated GET confirms no remote draft', async () => {
    const local = draft('残しておくローカル編集').document;
    const editor = await mountEditor(local, draft('以前のサーバー内容', 8));
    expect(editor.api.draftState.value.base?.revision).toBe(8);
    await editor.reply(null);
    expect(editor.api.draftState.value.base).toBeNull();
    expect(editor.api.documentFromEditor()).toEqual(local);
    expect(editor.api.serverDirty.value).toBe(true);
    const metadata = editor.storage.get(drafts.homeDraftSyncStorageKey)!;
    expect(JSON.parse(metadata).base).toBeNull();
    const save = editor.api.saveServerDraft();
    expect(JSON.parse(String(editor.requests.at(-1)!.options.body)).baseRevision).toBe(0);
    await editor.reply(draft('残しておくローカル編集'));
    await save;
    expect(editor.api.serverDirty.value).toBe(false);
    editor.unmount();
  });

  it('recovers from a conflict after a successful empty GET without discarding local edits', async () => {
    const editor = await mountEditor();
    await editor.reply(draft());
    editor.api.changeField('title', '競合後も残す編集');
    const failed = editor.api.saveServerDraft();
    await editor.reply(null, 409);
    await failed;
    expect(editor.api.serverError.value?.code).toBe('conflict');
    const reconnect = editor.api.checkServerDraft();
    await editor.reply(null);
    await reconnect;
    expect(editor.api.draftState.value.base).toBeNull();
    expect(editor.api.documentFromEditor().sections[0]!.content.title).toBe('競合後も残す編集');
    const save = editor.api.saveServerDraft();
    expect(editor.requests).toHaveLength(4);
    expect(JSON.parse(String(editor.requests.at(-1)!.options.body)).baseRevision).toBe(0);
    await editor.reply(draft('競合後も残す編集'));
    await save;
    expect(editor.api.serverDirty.value).toBe(false);
    editor.unmount();
  });

  it('invalidates an older load confirmation after a newer server check', async () => {
    const editor = await mountEditor();
    await editor.reply(draft());
    editor.api.changeField('title', '保持する現在の編集');
    const load = editor.api.checkServerDraft(false, true);
    await editor.reply(draft('読み込み候補', 2));
    await load;
    expect(editor.api.pendingServerLoad.value?.draft.revision).toBe(2);
    const reconnect = editor.api.checkServerDraft();
    await editor.reply(draft('最新のサーバー内容', 3));
    await reconnect;
    expect(editor.api.pendingServerLoad.value).toBeUndefined();
    editor.api.confirmServerLoad();
    expect(editor.api.draftState.value.base?.revision).toBe(1);
    expect(editor.api.documentFromEditor().sections[0]!.content.title).toBe('保持する現在の編集');
    editor.unmount();
  });

  it('does not clear a baseline or conflict on a failed empty-looking response', async () => {
    const editor = await mountEditor();
    await editor.reply(draft());
    editor.api.changeField('title', '変更');
    const failed = editor.api.saveServerDraft();
    await editor.reply(null, 409);
    await failed;
    const reconnect = editor.api.checkServerDraft();
    await editor.reply(null, 401);
    await reconnect;
    expect(editor.api.draftState.value.base?.revision).toBe(1);
    await editor.api.saveServerDraft();
    expect(editor.requests).toHaveLength(3);
    editor.unmount();
  });

  it('allows an explicit authentication retry while preserving current edits', async () => {
    const editor = await mountEditor();
    await editor.reply(null, 401);
    expect(editor.api.serverError.value?.code).toBe('authentication');
    editor.api.changeField('title', 'ログイン前の編集');
    const retry = editor.api.checkServerDraft();
    await editor.reply(null);
    await retry;
    expect(editor.api.serverError.value).toBeUndefined();
    const save = editor.api.saveServerDraft();
    await editor.reply(draft('ログイン前の編集'));
    await save;
    expect(editor.api.serverDirty.value).toBe(false);
    editor.unmount();
  });

  it('times out and aborts a request, releasing the busy state without losing edits', async () => {
    const editor = await mountEditor();
    await editor.reply(null);
    editor.api.changeField('title', 'タイムアウト前の編集');
    const save = editor.api.saveServerDraft();
    await vi.advanceTimersByTimeAsync(drafts.homeDraftRequestTimeoutMs);
    await save;
    expect(editor.requests.at(-1)!.options.signal?.aborted).toBe(true);
    expect(editor.api.serverError.value?.code).toBe('timeout');
    expect(editor.api.serverBusy.value).toBeNull();
    expect(editor.api.serverDirty.value).toBe(true);
    expect(editor.storage.get(documents.homeDraftStorageKey)).toContain('タイムアウト前の編集');
    editor.unmount();
  });

  it('keeps local edits and permits retry after an offline failure', async () => {
    const editor = await mountEditor();
    await editor.reply(null);
    editor.api.changeField('title', 'オフラインの編集');
    const save = editor.api.saveServerDraft();
    editor.requests.at(-1)!.reject(new Error('Offline'));
    await save;
    expect(editor.api.serverError.value?.code).toBe('network');
    expect(editor.api.documentFromEditor().sections[0]!.content.title).toBe('オフラインの編集');
    expect(editor.api.draftState.value.base).toBeNull();
    const retry = editor.api.saveServerDraft();
    await editor.reply(draft('オフラインの編集'));
    await retry;
    expect(editor.api.serverDirty.value).toBe(false);
    editor.unmount();
  });

  it('does not auto-load over an explicit reset while startup is pending', async () => {
    const editor = await mountEditor();
    editor.api.resetDraft();
    await editor.reply(draft());
    expect(editor.api.documentFromEditor()).toEqual(documents.createDefaultHomeDocument());
    expect(editor.api.draftState.value.base).toBeNull();
    editor.unmount();
  });

  it('preserves a reset made while a save is pending and uses the saved baseline afterward', async () => {
    const editor = await mountEditor();
    await editor.reply(draft());
    editor.api.changeField('title', '保存した編集');
    const save = editor.api.saveServerDraft();
    editor.api.resetDraft();
    await editor.reply(draft('保存した編集', 2));
    await save;
    expect(editor.api.documentFromEditor()).toEqual(documents.createDefaultHomeDocument());
    expect(editor.api.draftState.value.base?.revision).toBe(2);
    expect(editor.api.serverDirty.value).toBe(true);
    editor.unmount();
  });

  it('keeps imported JSON dirty without borrowing an unacknowledged server revision', async () => {
    const editor = await mountEditor(draft('元のローカル編集').document);
    await editor.reply(draft('他の編集', 7));
    const file = { size: 100, text: async () => documents.serializeHomeDocument(draft('JSON の編集').document) };
    await editor.api.importDraft({ target: { files: [file], value: 'draft.json' } } as unknown as Event);
    expect(editor.api.documentFromEditor()).toEqual(draft('JSON の編集').document);
    expect(editor.api.draftState.value.base).toBeNull();
    expect(editor.api.serverDirty.value).toBe(true);
    await editor.api.saveServerDraft();
    expect(editor.requests).toHaveLength(1);
    editor.unmount();
  });

  it('aborts pending work on navigation and flushes the local backup', async () => {
    const editor = await mountEditor();
    editor.api.changeField('title', '移動前の編集');
    editor.unmount();
    await flush();
    expect(editor.requests[0]!.options.signal?.aborted).toBe(true);
    expect(editor.api.draftState.value.base).toBeNull();
    expect(editor.storage.get(documents.homeDraftStorageKey)).toContain('移動前の編集');
  });
});

describe('unreadable local backup preservation', () => {
  it.each(['', '{broken json', '{"version":99,"page":"home"}'])(
    'keeps original data %j unchanged during pagehide and unmount', async (rawLocal) => {
      const editor = await mountEditor(undefined, undefined, { rawLocal });
      await editor.reply(null);
      editor.pagehide();
      editor.unmount();
      expect(editor.storage.get(documents.homeDraftStorageKey)).toBe(rawLocal);
      expect(editor.storage.has(drafts.homeDraftRecoveryStorageKey)).toBe(false);
      expect(editor.api.originalBackup.value).toBe(rawLocal);
    },
  );

  it('preserves the exact original in one recovery slot before autosaving purposeful edits', async () => {
    const original = ' {"broken":true,\n';
    const editor = await mountEditor(undefined, undefined, { rawLocal: original });
    await editor.reply(null);
    editor.api.changeField('title', '新しい編集');
    await vi.advanceTimersByTimeAsync(300);
    expect(editor.storage.get(drafts.homeDraftRecoveryStorageKey)).toBe(original);
    expect(editor.storage.get(documents.homeDraftStorageKey)).toContain('新しい編集');
    editor.api.changeField('title', 'その後の編集');
    editor.unmount();
    expect(editor.storage.get(drafts.homeDraftRecoveryStorageKey)).toBe(original);
    expect(editor.storage.get(documents.homeDraftStorageKey)).toContain('その後の編集');
  });

  it('keeps both originals when the recovery slot is occupied and blocks local overwrite', async () => {
    const editor = await mountEditor(undefined, undefined, { rawLocal: '{new broken', existing: '{older broken' });
    await editor.reply(null);
    editor.api.changeField('title', '保存できない編集');
    await vi.advanceTimersByTimeAsync(300);
    editor.pagehide();
    editor.unmount();
    expect(editor.storage.get(documents.homeDraftStorageKey)).toBe('{new broken');
    expect(editor.storage.get(drafts.homeDraftRecoveryStorageKey)).toBe('{older broken');
    expect(editor.api.error.value).toContain('自動保存を停止');
    expect(editor.api.originalBackup.value).toBe('{new broken');
  });

  it('does not overwrite the original when recovery storage fails', async () => {
    const editor = await mountEditor(undefined, undefined, { rawLocal: '{original', failWrite: true });
    await editor.reply(null);
    editor.api.resetDraft();
    editor.unmount();
    expect(editor.storage.get(documents.homeDraftStorageKey)).toBe('{original');
    expect(editor.storage.has(drafts.homeDraftRecoveryStorageKey)).toBe(false);
    expect(editor.api.error.value).toContain('自動保存を停止');
  });

  it('allows an identical recovery copy without replacing a different original', async () => {
    const editor = await mountEditor(undefined, undefined, { rawLocal: '{same', existing: '{same' });
    await editor.reply(null);
    editor.api.resetDraft();
    expect(editor.storage.get(drafts.homeDraftRecoveryStorageKey)).toBe('{same');
    expect(documents.parseHomeDocument(editor.storage.get(documents.homeDraftStorageKey)!))
      .toEqual(documents.createDefaultHomeDocument());
    editor.unmount();
  });

  it('offers the exact raw original for download without parsing or replacing it', async () => {
    const original = '  {"unreadable":\n';
    const editor = await mountEditor(undefined, undefined, { rawLocal: original });
    await editor.reply(null);
    editor.api.downloadOriginalBackup();
    expect(await editor.downloads[0]!.text()).toBe(original);
    editor.unmount();
    expect(editor.storage.get(documents.homeDraftStorageKey)).toBe(original);
  });

  it('retains the recovery download after reopening a healthy local draft', async () => {
    const local = draft('正常な編集').document;
    const editor = await mountEditor(local, undefined, { existing: '{old original' });
    await editor.reply(null);
    expect(editor.api.originalBackup.value).toBe('{old original');
    editor.api.changeField('title', '正常な自動保存');
    await vi.advanceTimersByTimeAsync(300);
    expect(editor.storage.get(documents.homeDraftStorageKey)).toContain('正常な自動保存');
    expect(editor.storage.get(drafts.homeDraftRecoveryStorageKey)).toBe('{old original');
    editor.unmount();
  });

  it('preserves the raw original before an explicit successful server save replaces the local backup', async () => {
    const editor = await mountEditor(undefined, undefined, { rawLocal: '{original' });
    await editor.reply(null);
    const save = editor.api.saveServerDraft();
    await editor.reply({ ...draft(), document: documents.createDefaultHomeDocument() });
    await save;
    expect(editor.storage.get(drafts.homeDraftRecoveryStorageKey)).toBe('{original');
    expect(documents.parseHomeDocument(editor.storage.get(documents.homeDraftStorageKey)!))
      .toEqual(documents.createDefaultHomeDocument());
    editor.unmount();
  });
});
