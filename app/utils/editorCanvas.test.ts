import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import type { Editor } from 'grapesjs';
import { configureHomeEditorCanvas } from './editorCanvas';
import { createDefaultHomeDocument } from './homeDocument';
import type { HomeSection } from './homeDocument';
import type { PropType } from 'vue';

const require = createRequire(import.meta.url);
// The repository's jsdom dependency has no bundled declarations; type only this test's API.
type TestDom = { window: Window & typeof globalThis };
const { JSDOM } = require('jsdom') as {
  JSDOM: new (html: string, options: Record<string, unknown>) => TestDom;
};
let editor: Editor | undefined;
let dom: TestDom | undefined;

afterEach(() => {
  editor?.destroy();
  editor = undefined;
  vi.restoreAllMocks();
  dom?.window.close();
  dom = undefined;
  vi.unstubAllGlobals();
});

describe('home editor canvas lifecycle', () => {
  it('mounts context-dependent Vue sections and layers during synchronous frame loading', async () => {
    dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
      url: 'http://localhost/', pretendToBeVisual: true, resources: 'usable', runScripts: 'dangerously',
    });
    for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Text',
      'HTMLScriptElement', 'SVGElement', 'DOMParser', 'MutationObserver']) {
      vi.stubGlobal(key, dom.window[key as keyof Window]);
    }
    vi.stubGlobal('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
    vi.stubGlobal('requestAnimationFrame', dom.window.requestAnimationFrame.bind(dom.window));
    vi.stubGlobal('cancelAnimationFrame', dom.window.cancelAnimationFrame.bind(dom.window));
    const { createApp, defineComponent, getCurrentInstance, h, inject, onUnmounted, render } = await import('vue');
    const { createEditorSectionVNode } = await import('../composables/editorSection');
    const grapesjs = require('grapesjs') as typeof import('grapesjs').default;
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    document.body.innerHTML = '<div id="canvas"></div><div id="layers"></div>';
    const theme = document.createElement('style');
    theme.dataset.editorTheme = 'true';
    theme.textContent = '.home-section { color: rgb(1, 102, 48); }';
    document.head.appendChild(theme);

    const unmounted = vi.fn();
    const SectionView = defineComponent({
      props: { section: { type: Object as PropType<HomeSection>, required: true } },
      setup(props) {
        // Nuxt composables read appContext.app; image, UI, and router components
        // also need the real root's plugins/provides, unlike a plain HTML stub.
        expect(getCurrentInstance()!.appContext.app).toBe(app);
        expect(inject('editor-theme')).toBe('clasteria');
        onUnmounted(unmounted);
        return () => h('section', { class: 'home-section site-reveal' }, props.section.content.title);
      },
    });
    const app = createApp(SectionView);
    app.provide('editor-theme', 'clasteria');
    const renderErrors = vi.fn();
    app.config.errorHandler = renderErrors;
    const sectionData = createDefaultHomeDocument().sections[0]!;
    editor = grapesjs.init({
      container: '#canvas',
      autorender: false,
      storageManager: false,
      telemetry: false,
      noticeOnUnload: false,
      panels: { defaults: [] },
      layerManager: { appendTo: '#layers', showWrapper: false, hidable: false },
      plugins: [(instance) => {
        instance.DomComponents.addType('clasteria-section', {
          model: { defaults: { droppable: false, editable: false, traits: [] } },
          view: {
            init() { this.listenTo(this.model, 'change:section', this.renderSection); },
            onRender() { this.renderSection(); },
            renderSection() {
              const section = this.model.get('section') as HomeSection;
              render(createEditorSectionVNode(SectionView, section, app._context), this.el);
              this.el.setAttribute('data-editor-section', section.id);
            },
            removed() { render(null, this.el); },
          },
        });
      }],
    });
    const instance = editor;
    const documentsDuringLoad: (Document | undefined)[] = [];
    instance.on('canvas:frame:load:head', () => {
      documentsDuringLoad.push(instance.Canvas.getDocument());
    });
    configureHomeEditorCanvas(instance, document);
    instance.setComponents([{ type: 'clasteria-section', section: sectionData }]);
    instance.UndoManager.clear();

    // Reproduce a browser loading about:blank while GrapesJS appends its frame,
    // before CanvasView has assigned the frame used by Canvas.getDocument().
    const appendChild = Node.prototype.appendChild;
    const loadedFrames = new WeakSet<HTMLIFrameElement>();
    vi.spyOn(Node.prototype, 'appendChild').mockImplementation(function <T extends Node>(this: Node, child: T): T {
      const result = appendChild.call(this, child) as T;
      if (this instanceof Element && this.isConnected && this.hasAttribute('data-frames')) {
        const frame = this.querySelector('iframe');
        if (frame?.contentDocument && !loadedFrames.has(frame)) {
          loadedFrames.add(frame);
          frame.dispatchEvent(new dom!.window.Event('load'));
        }
      }
      return result;
    });
    const loaded = new Promise<void>(resolve => instance.once('load', () => resolve()));
    instance.render();
    await loaded;

    expect(documentsDuringLoad).toEqual([undefined]);
    const frameDocument = instance.Canvas.getDocument();
    const frame = instance.Canvas.getFrameEl();
    const section = frameDocument.querySelector('[data-editor-section="hero"]')!;
    expect(section.querySelector('.home-section')?.textContent).toBe(sectionData.content.title);
    expect(document.querySelectorAll('#layers .gjs-layer').length).toBeGreaterThan(0);
    expect(frameDocument.head.querySelector('[data-editor-theme]')?.textContent).toBe(theme.textContent);
    expect(frameDocument.head.querySelector('[data-clasteria-canvas]')?.textContent).toContain('opacity: 1 !important');
    expect(frameDocument.documentElement.lang).toBe('ja');

    const model = instance.getComponents().at(0);
    model.set('section', { ...sectionData, content: { ...sectionData.content, title: 'Changed title' } });
    expect(section.querySelector('.home-section')?.textContent).toBe('Changed title');
    expect(instance.UndoManager.hasUndo()).toBe(true);
    instance.UndoManager.undo();
    expect(section.querySelector('.home-section')?.textContent).toBe(sectionData.content.title);

    expect(renderErrors).not.toHaveBeenCalled();
    instance.destroy();
    editor = undefined;
    expect(unmounted).toHaveBeenCalledOnce();
    expect(section.childNodes).toHaveLength(0);
    expect(frame.isConnected).toBe(false);
  });
});
