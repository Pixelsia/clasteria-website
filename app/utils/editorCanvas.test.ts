import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import type { Editor } from 'grapesjs';
import { configureHomeEditorCanvas } from './editorCanvas';

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
  it('mounts Vue and native layers during synchronous frame loading and preserves theme styles', async () => {
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
    const { defineComponent, h, onUnmounted, render, Suspense } = require('vue') as typeof import('vue');
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
      props: { title: { type: String, required: true } },
      setup(props) {
        onUnmounted(unmounted);
        return () => h('section', { class: 'home-section site-reveal' }, props.title);
      },
    });
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
              const section = this.model.get('section') as { id: string; title: string };
              render(h(Suspense, {}, { default: () => h(SectionView, { title: section.title }) }), this.el);
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
    instance.setComponents([{ type: 'clasteria-section', section: { id: 'hero', title: 'Original title' } }]);
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
    expect(section.querySelector('.home-section')?.textContent).toBe('Original title');
    expect(document.querySelectorAll('#layers .gjs-layer').length).toBeGreaterThan(0);
    expect(frameDocument.head.querySelector('[data-editor-theme]')?.textContent).toBe(theme.textContent);
    expect(frameDocument.head.querySelector('[data-clasteria-canvas]')?.textContent).toContain('opacity: 1 !important');
    expect(frameDocument.documentElement.lang).toBe('ja');

    const model = instance.getComponents().at(0);
    model.set('section', { id: 'hero', title: 'Changed title' });
    expect(section.querySelector('.home-section')?.textContent).toBe('Changed title');
    expect(instance.UndoManager.hasUndo()).toBe(true);
    instance.UndoManager.undo();
    expect(section.querySelector('.home-section')?.textContent).toBe('Original title');

    instance.destroy();
    editor = undefined;
    expect(unmounted).toHaveBeenCalledOnce();
    expect(section.childNodes).toHaveLength(0);
    expect(frame.isConnected).toBe(false);
  });
});
