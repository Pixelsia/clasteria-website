import { readFileSync } from 'node:fs';
import { NodeTypes } from '@vue/compiler-core';
import type { ElementNode, RootNode } from '@vue/compiler-core';
import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parse } from 'vue/compiler-sfc';
import * as documents from '../../utils/homeDocument';
import * as drafts from '../../utils/homeDraftClient';
import * as pageDocuments from '../../utils/pageDocument';
import * as pageDrafts from '../../utils/pageDraftClient';
import type { PageDocument as HomeDocument, PageSection as HomeSection, PageId } from '../../utils/pageDocument';
import type { PageDraftClientState as HomeDraftClientState, PageDraftRequestError as HomeDraftRequestError, ServerPageDraft as ServerHomeDraft } from '../../utils/pageDraftClient';

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
  noticeVisible: Ref<boolean>;
  dismissNotice: () => Promise<void>;
  showNotice: () => Promise<void>;
  saveServerDraft: () => Promise<void>;
  checkServerDraft: (automatic?: boolean, load?: boolean) => Promise<void>;
  confirmServerLoad: () => void;
  cancelServerLoad: () => void;
  changeField: (key: string, value: string) => void;
  resetDraft: () => void;
  importDraft: (event: Event) => Promise<void>;
  documentFromEditor: () => HomeDocument;
  downloadDraft: () => void;
  downloadOriginalBackup: () => void;
  requestPageSwitch: (page: string) => void;
  switchPage: (page: PageId) => void;
  pendingPageSwitch: Ref<PageId | undefined>;
  preview: () => void;
};

type Request = {
  url: string;
  options: RequestInit;
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
};

const source = readFileSync(new URL('./HomeEditor.client.vue', import.meta.url), 'utf8');
const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)![1]!;
const executable = ts.transpileModule(`${script}\nexport const api = {
  draftState, serverBusy, serverError, serverDirty, pendingServerLoad, serverStatus, status, error, originalBackup,
  noticeVisible, dismissNotice, showNotice,
  saveServerDraft, checkServerDraft, confirmServerLoad, cancelServerLoad,
  changeField, resetDraft, importDraft, documentFromEditor, downloadDraft, downloadOriginalBackup,
  requestPageSwitch, switchPage, pendingPageSwitch, preview,
};`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

type TemplateElement = { element: ElementNode; ancestors: ElementNode[] };

function templateElements(node: RootNode | ElementNode, ancestors: ElementNode[] = []): TemplateElement[] {
  return node.children.flatMap(child => child.type === NodeTypes.ELEMENT
    ? [{ element: child, ancestors }, ...templateElements(child, [...ancestors, child])]
    : []);
}

function noticeControlled({ element, ancestors }: TemplateElement) {
  return [...ancestors, element].some(node => node.props.some(prop => prop.type === NodeTypes.DIRECTIVE
    && ['if', 'show'].includes(prop.name) && /\bnoticeVisible\b/.test(prop.exp?.loc.source ?? '')));
}

function ifCondition(element: ElementNode) {
  const directive = element.props.find(prop => prop.type === NodeTypes.DIRECTIVE && prop.name === 'if');
  return directive?.type === NodeTypes.DIRECTIVE ? directive.exp?.loc.source : undefined;
}

async function flush() {
  for (let index = 0; index < 20; index++) await Promise.resolve();
}

async function mountEditor(
  local?: HomeDocument,
  baseline?: ServerHomeDraft,
  recovery: {
    rawLocal?: string; existing?: string; failWrite?: boolean; storage?: ReadonlyMap<string, string>; page?: PageId;
  } = {},
) {
  const storage = new Map(recovery.storage);
  const pageId = recovery.page ?? local?.page ?? 'home';
  const keys = pageDrafts.pageStorageKeys(pageId);
  const navigations: string[] = [];
  const session = new Map<string, string>();
  let routeUpdate: ((to: { query: { page: string } }) => unknown) | undefined;
  if (local) {
    storage.set(keys.draft, pageDocuments.serializePageDocument(local));
    if (baseline) {
      storage.set(keys.sync, pageDrafts.serializePageDraftSyncState({
        ...pageDrafts.createPageDraftClientState(local), base: baseline,
      }));
    }
  }
  if (recovery.rawLocal !== undefined) storage.set(keys.draft, recovery.rawLocal);
  if (recovery.existing !== undefined) storage.set(keys.recovery, recovery.existing);
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
  const editorRefresh = vi.fn();
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
    refresh: editorRefresh,
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
      if (key === keys.recovery && recovery.failWrite) throw new Error('Quota exceeded');
      storage.set(key, value);
    },
  });
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => session.get(key) ?? null, setItem: (key: string, value: string) => session.set(key, value) });
  vi.stubGlobal('fetch', (url: string, options: RequestInit) => new Promise<Response>((resolve, reject) => {
    requests.push({ url, options, resolve, reject });
    options.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
  }));
  const ref = <T>(value?: T) => ({ value });
  const noticeToggleFocus = vi.fn();
  const bindings = {
    defineProps: () => ({ page: pageId }),
    withDefaults: (props: object, defaults: object) => ({ ...defaults, ...props }),
    getCurrentInstance: () => ({ appContext: {} }),
    useTemplateRef: (name: string) => ref(name === 'noticeToggle' ? { focus: noticeToggleFocus } : {}),
    shallowRef: ref,
    ref,
    nextTick: () => Promise.resolve(),
    computed: <T>(get: () => T) => ({ get value() { return get(); } }),
    onMounted: (callback: () => Promise<void>) => { mounted = callback; },
    onBeforeUnmount: (callback: () => void) => { unmounted = callback; },
    navigateTo: (url: string) => { navigations.push(url); },
    onBeforeRouteUpdate: (callback: typeof routeUpdate) => { routeUpdate = callback; },
    onBeforeRouteLeave: () => {},
  };
  const modules: Record<string, unknown> = {
    'vue': { render: () => {} },
    'grapesjs': { default: { init: () => editor } },
    'grapesjs/dist/css/grapes.min.css': {},
    '~/utils/homeDocument': documents,
    '~/utils/pageDocument': pageDocuments,
    '~/utils/pageDraftClient': pageDrafts,
    '~/utils/homeDraftClient': drafts,
    '~/utils/editorCanvas': { configureHomeEditorCanvas: () => {} },
    '~/composables/editorSection': { createEditorSectionVNode: () => {} },
    '~/components/top/HomeSection.vue': {},
    '~/components/editor/PageSection.vue': {},
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
    api: exported.api, requests, storage, reply, downloads, noticeToggleFocus, editorRefresh, navigations, session,
    navigateQuery: (page: string) => routeUpdate?.({ query: { page } }),
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

describe('dismissible editor notice', () => {
  it('starts visible and returns focus to the toolbar control after dismissal', async () => {
    const editor = await mountEditor();
    expect(editor.api.noticeVisible.value).toBe(true);
    const dismissal = editor.api.dismissNotice();
    expect(editor.api.noticeVisible.value).toBe(false);
    expect(editor.noticeToggleFocus).not.toHaveBeenCalled();
    expect(editor.editorRefresh).not.toHaveBeenCalled();
    await dismissal;
    expect(editor.noticeToggleFocus).toHaveBeenCalledOnce();
    expect(editor.editorRefresh).toHaveBeenCalledExactlyOnceWith({ tools: true });
    editor.unmount();
  });

  it('dismisses and reopens without changing the draft, baseline, storage, or requests', async () => {
    const editor = await mountEditor();
    await editor.reply(draft());
    editor.api.changeField('title', '案内を閉じても残す編集');
    await vi.advanceTimersByTimeAsync(300);
    const document = structuredClone(editor.api.documentFromEditor());
    const state = structuredClone(editor.api.draftState.value);
    const baseline = editor.api.draftState.value.base;
    const storage = new Map(editor.storage);
    const requests = editor.requests.length;
    const status = editor.api.status.value;
    const serverStatus = editor.api.serverStatus.value;
    const expectUnchanged = () => {
      expect(editor.api.documentFromEditor()).toEqual(document);
      expect(editor.api.draftState.value).toEqual(state);
      expect(editor.api.draftState.value.base).toBe(baseline);
      expect(editor.api.serverDirty.value).toBe(true);
      expect(editor.api.status.value).toBe(status);
      expect(editor.api.serverStatus.value).toBe(serverStatus);
      expect(editor.storage).toEqual(storage);
      expect(editor.requests).toHaveLength(requests);
    };

    await editor.api.dismissNotice();
    expect(editor.api.noticeVisible.value).toBe(false);
    expect(editor.editorRefresh).toHaveBeenCalledExactlyOnceWith({ tools: true });
    expectUnchanged();
    const reopening = editor.api.showNotice();
    expect(editor.api.noticeVisible.value).toBe(true);
    expect(editor.editorRefresh).toHaveBeenCalledTimes(1);
    await reopening;
    expect(editor.editorRefresh).toHaveBeenCalledTimes(2);
    expect(editor.editorRefresh).toHaveBeenLastCalledWith({ tools: true });
    expectUnchanged();
    editor.unmount();
  });

  it('shows the notice on a fresh mount with the same browser storage', async () => {
    const editor = await mountEditor();
    await editor.reply(draft());
    await editor.api.dismissNotice();
    editor.unmount();
    const reopened = await mountEditor(undefined, undefined, { storage: editor.storage });
    expect(reopened.api.noticeVisible.value).toBe(true);
    expect(reopened.api.documentFromEditor()).toEqual(draft().document);
    reopened.unmount();
  });

  it.each([401, 409])('retains server errors when the notice is dismissed (HTTP %i)', async (status) => {
    const editor = await mountEditor();
    await editor.reply(null, status);
    const error = editor.api.serverError.value;
    expect(error).toBeDefined();
    await editor.api.dismissNotice();
    expect(editor.api.serverError.value).toBe(error);
    editor.unmount();
  });

  it('keeps a pending replacement confirmation actionable after dismissal', async () => {
    const editor = await mountEditor(draft('残している編集').document);
    await editor.reply(draft());
    const load = editor.api.checkServerDraft(false, true);
    await editor.reply(draft());
    await load;
    const confirmation = editor.api.pendingServerLoad.value;
    expect(confirmation).toBeDefined();
    await editor.api.dismissNotice();
    expect(editor.api.pendingServerLoad.value).toBe(confirmation);
    editor.api.confirmServerLoad();
    expect(editor.api.documentFromEditor()).toEqual(draft().document);
    expect(editor.api.pendingServerLoad.value).toBeUndefined();
    editor.unmount();
  });

  it('hides both routine bands while retaining accessible controls and critical guidance', () => {
    const { descriptor, errors } = parse(source);
    expect(errors).toEqual([]);
    const elements = templateElements(descriptor.template!.ast!);
    const routineBands = elements.filter(({ element }) => element.props.some(prop => prop.type === NodeTypes.ATTRIBUTE
      && ((prop.name === 'class' && prop.value?.content.split(/\s+/).includes('editor-notice'))
        || (prop.name === 'aria-label' && prop.value?.content === 'サーバーの下書き保存'))));
    expect(routineBands).toHaveLength(2);
    for (const { element, ancestors } of routineBands) {
      expect([...ancestors, element].some(node => ifCondition(node) === 'noticeVisible')).toBe(true);
    }
    for (const binding of ['status', 'serverStatus', 'draftState.base.revision']) {
      const statuses = routineBands.flatMap(({ element }) => templateElements(element))
        .filter(({ element }) => element.children.some(child => child.type === NodeTypes.INTERPOLATION
          && (binding === 'status' ? child.content.loc.source.trim() === binding : child.content.loc.source.includes(binding))));
      expect(statuses.length, `Missing routine status: ${binding}`).toBeGreaterThan(0);
    }

    const toggle = elements.find(({ element }) => element.props.some(prop => prop.type === NodeTypes.ATTRIBUTE
      && prop.name === 'ref' && prop.value?.content === 'noticeToggle'));
    expect(toggle).toBeDefined();
    expect(noticeControlled(toggle!)).toBe(false);
    expect(toggle!.element.props.some(prop => prop.type === NodeTypes.DIRECTIVE && prop.name === 'bind'
      && prop.arg?.loc.source === 'aria-expanded' && prop.exp?.loc.source === 'noticeVisible')).toBe(true);
    const close = elements.find(({ element }) => element.props.some(prop => prop.type === NodeTypes.DIRECTIVE
      && prop.name === 'on' && prop.arg?.loc.source === 'click' && prop.exp?.loc.source === 'dismissNotice'));
    expect(close).toBeDefined();
    expect(close!.element.props.some(prop => prop.type === NodeTypes.ATTRIBUTE
      && prop.name === 'aria-label' && !!prop.value?.content)).toBe(true);

    for (const condition of ['error', 'serverError', 'pendingServerLoad', 'saveRequiresLoad && !serverError', 'originalBackup !== undefined']) {
      const guidance = elements.find(({ element }) => ifCondition(element) === condition);
      expect(guidance, `Missing critical guidance: ${condition}`).toBeDefined();
      expect(noticeControlled(guidance!), `Notice dismissal hides critical guidance: ${condition}`).toBe(false);
    }
  });
});

describe('multiline editor content', () => {
  const cases = (['home', 'support', 'article-draft'] as const).flatMap(page => [
    { page, ending: 'LF', newline: '\n' },
    { page, ending: 'CRLF', newline: '\r\n' },
  ]);
  const content = (newline: string) => ({
    title: `  一行目${newline}二行目${newline}${newline}<br> は文字列  `,
    description: `説明の一行目${newline}${newline}説明の三行目${newline}<script>alert("text")</script> と \\n`,
  });

  it.each(cases)('autosaves and restores exact $ending title/description and preview text on $page', async ({ page, newline }) => {
    const editor = await mountEditor(undefined, undefined, { page });
    await editor.reply(null);
    const text = content(newline);
    for (const [key, value] of Object.entries(text)) editor.api.changeField(key, value);
    expect(editor.api.documentFromEditor().sections[0]!.content).toMatchObject(text);
    await vi.advanceTimersByTimeAsync(300);

    const keys = pageDrafts.pageStorageKeys(page);
    const saved = pageDocuments.parsePageDocument(editor.storage.get(keys.draft)!, page);
    expect(saved.sections[0]!.content).toMatchObject(text);
    expect(editor.api.error.value).toBe('');
    editor.api.preview();
    expect(editor.navigations).toEqual([`/editor/preview?page=${page}`]);
    expect(pageDocuments.parsePageDocument(editor.session.get(keys.preview)!, page)).toEqual(saved);
    editor.unmount();

    const reopened = await mountEditor(undefined, undefined, { page, storage: editor.storage });
    await reopened.reply(null);
    expect(reopened.api.documentFromEditor()).toEqual(saved);
    expect(reopened.api.documentFromEditor().sections[0]!.content).toMatchObject(text);
    reopened.unmount();
  });

  it.each(cases)('retains exact $ending content through a server save response and fresh $page load', async ({ page, newline }) => {
    const editor = await mountEditor(undefined, undefined, { page });
    await editor.reply(null);
    const text = content(newline);
    for (const [key, value] of Object.entries(text)) editor.api.changeField(key, value);
    const save = editor.api.saveServerDraft();
    const request = editor.requests.at(-1)!;
    expect(request.url).toBe(`/api/editor/${page}`);
    expect(request.options.method).toBe('PUT');
    const submitted = JSON.parse(String(request.options.body));
    expect(submitted.document.sections[0].content).toMatchObject(text);
    expect(submitted.baseRevision).toBe(0);
    const remote = { document: submitted.document, revision: 1, updatedAt: '2026-10-03T10:00:00Z' };
    await editor.reply(remote);
    await save;
    expect(editor.api.serverError.value).toBeUndefined();
    expect(editor.api.serverDirty.value).toBe(false);
    expect(editor.api.draftState.value.base?.document.sections[0]!.content).toMatchObject(text);
    expect(editor.api.documentFromEditor().sections[0]!.content).toMatchObject(text);
    editor.unmount();

    const reopened = await mountEditor(undefined, undefined, { page });
    await reopened.reply(remote);
    expect(reopened.api.documentFromEditor()).toEqual(submitted.document);
    expect(reopened.api.serverDirty.value).toBe(false);
    const keys = pageDrafts.pageStorageKeys(page);
    expect(pageDocuments.parsePageDocument(reopened.storage.get(keys.draft)!, page).sections[0]!.content)
      .toMatchObject(text);
    reopened.unmount();
  });

  it.each(cases)('exports and imports $ending JSON on $page without double escaping or interpreting HTML', async ({ page, newline }) => {
    const editor = await mountEditor(undefined, undefined, { page });
    await editor.reply(null);
    const text = content(newline);
    for (const [key, value] of Object.entries(text)) editor.api.changeField(key, value);
    editor.api.downloadDraft();
    expect(editor.downloads).toHaveLength(1);
    const json = await editor.downloads[0]!.text();
    expect(JSON.parse(json).sections[0].content).toMatchObject(text);
    expect(json).toContain(JSON.stringify(text.title));
    expect(json).toContain(JSON.stringify(text.description));
    editor.unmount();

    const imported = await mountEditor(undefined, undefined, { page });
    await imported.reply(null);
    const file = { size: new TextEncoder().encode(json).byteLength, text: async () => json };
    const input = { files: [file], value: 'multiline-draft.json' };
    await imported.api.importDraft({ target: input } as unknown as Event);
    expect(input.value).toBe('');
    expect(imported.api.error.value).toBe('');
    expect(imported.api.documentFromEditor().sections[0]!.content).toMatchObject(text);
    const keys = pageDrafts.pageStorageKeys(page);
    expect(pageDocuments.parsePageDocument(imported.storage.get(keys.draft)!, page).sections[0]!.content)
      .toMatchObject(text);
    imported.api.downloadDraft();
    expect(await imported.downloads[0]!.text()).toBe(json);
    imported.unmount();
  });

  it('uses accessible multiline controls and guidance only for prose fields', () => {
    const { descriptor, errors } = parse(source);
    expect(errors).toEqual([]);
    const elements = templateElements(descriptor.template!.ast!);
    const fields = elements.map(({ element }) => element)
      .filter(element => element.props.some(prop => prop.type === NodeTypes.DIRECTIVE
        && prop.name === 'bind' && prop.arg?.loc.source === 'id' && prop.exp?.loc.source === '`editor-field-${key}`'));
    expect(fields.map(element => element.tag)).toEqual(['select', 'textarea', 'input']);
    const textarea = fields.find(element => element.tag === 'textarea')!;
    const condition = 'isMultilinePageField(selected.kind, key)';
    expect(textarea.props.some(prop => prop.type === NodeTypes.DIRECTIVE
      && prop.name === 'else-if' && prop.exp?.loc.source === condition)).toBe(true);
    expect(textarea.props.some(prop => prop.type === NodeTypes.ATTRIBUTE
      && prop.name === 'rows' && prop.value?.content === '3')).toBe(true);
    expect(textarea.props.some(prop => prop.type === NodeTypes.DIRECTIVE && prop.name === 'bind'
      && prop.arg?.loc.source === 'aria-describedby' && prop.exp?.loc.source === '`editor-field-${key}-hint`')).toBe(true);
    expect(textarea.props.some(prop => prop.type === NodeTypes.DIRECTIVE && prop.name === 'on'
      && prop.arg?.loc.source === 'input' && prop.exp?.loc.source === 'changeField(key, ($event.target as HTMLTextAreaElement).value)')).toBe(true);
    expect(textarea.props.some(prop => prop.type === NodeTypes.DIRECTIVE
      && prop.name === 'on' && ['keydown', 'keypress', 'keyup'].includes(prop.arg?.loc.source ?? ''))).toBe(false);

    const input = fields.find(element => element.tag === 'input')!;
    expect(input.props.some(prop => prop.type === NodeTypes.DIRECTIVE && prop.name === 'else')).toBe(true);
    expect(input.props.some(prop => prop.type === NodeTypes.ATTRIBUTE
      && prop.name === 'type' && prop.value?.content === 'text')).toBe(true);
    const hint = elements.find(({ element }) => element.props.some(prop => prop.type === NodeTypes.DIRECTIVE
      && prop.name === 'bind' && prop.arg?.loc.source === 'id' && prop.exp?.loc.source === '`editor-field-${key}-hint`'));
    expect(hint).toBeDefined();
    expect(ifCondition(hint!.element)).toBe(condition);
    expect(hint!.element.children.some(child => child.type === NodeTypes.TEXT
      && child.content.includes('Enter キーで改行できます。改行はプレビューにも反映されます。'))).toBe(true);
  });
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
    const file = { size: 100, text: async () => pageDocuments.serializePageDocument(draft('JSON の編集').document) };
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

describe('multi-page editing controls', () => {
  it.each(['support', 'articles', 'onigokko', 'kakurenbo', 'login', 'register', 'leaderboard', 'codingcraft', 'article-draft'] as const)(
    'opens, edits, saves, restores and previews %s in its own namespace', async (page) => {
      const editor = await mountEditor(undefined, undefined, { page });
      expect(editor.requests[0]!.url).toBe(`/api/editor/${page}`);
      await editor.reply(null);
      editor.api.changeField('title', `${page} の編集`);
      await vi.advanceTimersByTimeAsync(350);
      const keys = pageDrafts.pageStorageKeys(page);
      expect(pageDocuments.parsePageDocument(editor.storage.get(keys.draft)!).page).toBe(page);
      expect(editor.storage.has(documents.homeDraftStorageKey)).toBe(false);
      const save = editor.api.saveServerDraft();
      const submitted = JSON.parse(String(editor.requests.at(-1)!.options.body));
      expect(submitted.document.page).toBe(page);
      await editor.reply({ document: submitted.document, revision: 1, updatedAt: '2026-10-02T19:00:00Z' });
      await save;
      expect(editor.api.serverDirty.value).toBe(false);
      editor.api.preview();
      expect(editor.navigations).toEqual([`/editor/preview?page=${page}`]);
      expect(pageDocuments.parsePageDocument(editor.session.get(keys.preview)!).sections[0]!.content.title).toBe(`${page} の編集`);
      editor.unmount();
      const restored = await mountEditor(undefined, undefined, { page, storage: editor.storage });
      expect(restored.api.documentFromEditor().sections[0]!.content.title).toBe(`${page} の編集`);
      expect(restored.api.draftState.value.base?.revision).toBe(1);
      restored.unmount();
    },
  );

  it('confirms unsaved page switching and preserves the current page on cancel', async () => {
    const editor = await mountEditor();
    await editor.reply(null);
    editor.api.changeField('title', 'Home の未保存文章');
    editor.api.requestPageSwitch('support');
    expect(editor.api.pendingPageSwitch.value).toBe('support');
    expect(editor.navigations).toEqual([]);
    editor.api.pendingPageSwitch.value = undefined;
    expect(editor.api.documentFromEditor().sections[0]!.content.title).toBe('Home の未保存文章');
    editor.api.requestPageSwitch('support');
    editor.api.switchPage('support');
    expect(editor.navigations).toEqual(['/editor?page=support']);
    expect(editor.storage.get(documents.homeDraftStorageKey)).toContain('Home の未保存文章');
    editor.unmount();
  });

  it('guards browser query navigation and blocks switching while a save is pending', async () => {
    const editor = await mountEditor();
    await editor.reply(null);
    expect(editor.navigateQuery('support')).toBe(false);
    expect(editor.api.pendingPageSwitch.value).toBe('support');
    editor.api.pendingPageSwitch.value = undefined;
    const save = editor.api.saveServerDraft();
    editor.api.requestPageSwitch('support');
    editor.api.switchPage('support');
    expect(editor.api.pendingPageSwitch.value).toBeUndefined();
    expect(editor.navigations).toEqual([]);
    await editor.reply(draft());
    await save;
    editor.unmount();
  });

  it('rejects another page’s import and server response without changing the editor', async () => {
    const editor = await mountEditor();
    await editor.reply(null);
    const original = editor.api.documentFromEditor();
    const other = pageDocuments.createDefaultPageDocument('support');
    const file = { size: 100, text: async () => pageDocuments.serializePageDocument(other) };
    await editor.api.importDraft({ target: { files: [file], value: 'draft.json' } } as unknown as Event);
    expect(editor.api.error.value).toContain('別のページ');
    expect(editor.api.documentFromEditor()).toEqual(original);
    const load = editor.api.checkServerDraft(true);
    await editor.reply({ document: other, revision: 1, updatedAt: '2026-10-02T19:00:00Z' });
    await load;
    expect(editor.api.serverError.value?.code).toBe('invalid_response');
    expect(editor.api.documentFromEditor()).toEqual(original);
    editor.unmount();
  });

  it('clears a local validation error once a partly typed article identifier becomes valid', async () => {
    const editor = await mountEditor(undefined, undefined, { page: 'article-draft' });
    await editor.reply(null);
    editor.api.changeField('slug', '2026');
    await vi.advanceTimersByTimeAsync(350);
    expect(editor.api.error.value).toContain('記事の識別子');
    editor.api.changeField('slug', '20261002-example');
    await vi.advanceTimersByTimeAsync(350);
    expect(editor.api.error.value).toBe('');
    expect(editor.storage.get(pageDrafts.pageStorageKeys('article-draft').draft)).toContain('20261002-example');
    editor.unmount();
  });

  it('preserves cross-page local data but renders the selected page default', async () => {
    const rawLocal = pageDocuments.serializePageDocument(pageDocuments.createDefaultPageDocument('home'));
    const editor = await mountEditor(undefined, undefined, { page: 'support', rawLocal });
    expect(editor.api.documentFromEditor()).toEqual(pageDocuments.createDefaultPageDocument('support'));
    expect(editor.api.originalBackup.value).toBe(rawLocal);
    expect(editor.storage.get(pageDrafts.pageStorageKeys('support').draft)).toBe(rawLocal);
    editor.unmount();
  });

  it('does not switch away when a damaged backup cannot be safely preserved', async () => {
    const editor = await mountEditor(undefined, undefined, { page: 'support', rawLocal: '{broken', existing: '{older' });
    await editor.reply(null);
    editor.api.changeField('title', '新しいお問い合わせ');
    editor.api.requestPageSwitch('home');
    editor.api.switchPage('home');
    expect(editor.navigations).toEqual([]);
    expect(editor.storage.get(pageDrafts.pageStorageKeys('support').draft)).toBe('{broken');
    expect(editor.api.error.value).toContain('元のバックアップ');
    editor.unmount();
  });
});
