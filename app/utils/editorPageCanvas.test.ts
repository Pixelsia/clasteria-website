/* eslint-disable vue/one-component-per-file -- Context-checking Nuxt boundary adapters belong to this regression. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Editor } from 'grapesjs';
import type { Component, ComponentOptions, PropType } from 'vue';
import { configureHomeEditorCanvas } from './editorCanvas';
import { createDefaultPageDocument } from './pageDocument';
import type { PageSection } from './pageDocument';
import * as siteContent from './siteContent';
import * as date from './date';

const require = createRequire(import.meta.url);
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

describe('real page components in the editor canvas', () => {
  it('renders support and an unpublished page, updates content/styles, and disposes Vue trees', async () => {
    dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
      url: 'http://localhost/', pretendToBeVisual: true, resources: 'usable', runScripts: 'dangerously',
    });
    for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Text',
      'HTMLScriptElement', 'SVGElement', 'DOMParser', 'MutationObserver']) {
      vi.stubGlobal(key, dom.window[key as keyof Window]);
    }
    vi.stubGlobal('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
    vi.stubGlobal('requestAnimationFrame', dom.window.requestAnimationFrame.bind(dom.window));
    vi.stubGlobal('cancelAnimationFrame', dom.window.cancelAnimationFrame.bind(dom.window));
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });

    // Keep this regression in the existing Node Vitest suite. Compile the real local
    // SFCs, including nested site/content components and their scoped CSS. Only Nuxt
    // infrastructure at the boundary is adapted; full Nuxt/browser QA lives in
    // e2e-tests/editor-pages.mjs and is not represented by this test passing.
    const vue = await import('vue');
    const { createApp, defineComponent, getCurrentInstance, h, inject, nextTick, render } = vue;
    const { compileScript, compileStyle, parse } = await import('@vue/compiler-sfc');
    const { ModuleKind, ScriptTarget, transpileModule } = await import('typescript');
    const { createEditorSectionVNode } = await import('../composables/editorSection');
    const appDirectory = fileURLToPath(new URL('..', import.meta.url));
    const loaded = new Map<string, { default: Component }>();

    function loadComponent(filename: string): { default: Component } {
      const cached = loaded.get(filename);
      if (cached) return cached;
      const id = `data-v-test-${loaded.size}`;
      const { descriptor, errors } = parse(readFileSync(filename, 'utf8'), { filename });
      expect(errors, filename).toEqual([]);
      const script = compileScript(descriptor, { id, inlineTemplate: true });
      const module = { exports: {} as { default: Component } };
      loaded.set(filename, module.exports);
      function componentRequire(name: string): unknown {
        if (name === 'vue') return vue;
        // These services are imported by branches not exercised here. Fail if a
        // fixture accidentally starts relying on their unavailable Nuxt services.
        if (name === '~/composables/articles' || name === '~/composables/images') {
          return new Proxy({}, {
            get: () => () => { throw new Error(`Unexpected service: ${name}`); },
          });
        }
        const path = name.startsWith('~/') ? resolve(appDirectory, name.slice(2)) : resolve(dirname(filename), name);
        if (extname(path) === '.vue') return loadComponent(path);
        if (name === '~/utils/siteContent') return siteContent;
        if (name === '~/utils/date') return date;
        return require(name);
      }
      const code = transpileModule(script.content, {
        compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
      }).outputText;
      // Nuxt's Vue auto-imports are supplied from the same runtime as the canvas.
      const execute = new Function('require', 'module', 'exports', 'computed', 'ref', code);
      execute(componentRequire, module, module.exports, vue.computed, vue.ref);
      const component = module.exports.default as ComponentOptions;
      component.__file = filename;
      component.__scopeId = id;
      for (const style of descriptor.styles) {
        const compiled = compileStyle({ source: style.content, filename, id, scoped: style.scoped });
        expect(compiled.errors, filename).toEqual([]);
        const element = document.createElement('style');
        element.dataset.pageComponent = filename;
        element.textContent = compiled.code;
        document.head.appendChild(element);
      }
      return module.exports;
    }

    const PageSectionView = loadComponent(resolve(appDirectory, 'components/editor/PageSection.vue')).default;
    const app = createApp(defineComponent({ render: () => null }));
    const nuxt = { $config: { public: { visualEditorEnabled: true } }, vueApp: app };
    Object.defineProperty(app, '$nuxt', { value: nuxt });
    app.provide('nuxt-test-context', nuxt);
    const errors = vi.fn();
    const warnings = vi.fn();
    app.config.errorHandler = errors;
    app.config.warnHandler = warnings;
    const mounted: string[] = [];
    const unmounted: string[] = [];
    app.mixin({
      mounted() { if (this.$options.__file) mounted.push(this.$options.__file); },
      unmounted() { if (this.$options.__file) unmounted.push(this.$options.__file); },
    });

    function requireNuxtContext() {
      // Nuxt reads getCurrentInstance().appContext.app.$nuxt. A context assigned
      // only to Suspense loses this app and its registered components/provides.
      const current = getCurrentInstance()!;
      expect(current.appContext.app).toBe(app);
      expect((current.appContext.app as typeof app & { $nuxt: unknown }).$nuxt).toBe(nuxt);
      expect(inject('nuxt-test-context')).toBe(nuxt);
    }
    app.component('UContainer', defineComponent({
      props: { as: { type: String, default: 'div' } },
      setup(props, { slots }) {
        requireNuxtContext();
        return () => h(props.as, {}, slots.default?.());
      },
    }));
    app.component('UButton', defineComponent({
      props: { to: { type: String, default: '' } },
      setup(props, { slots }) {
        requireNuxtContext();
        return () => h(props.to ? 'a' : 'button', props.to ? { href: props.to } : {}, slots.default?.());
      },
    }));
    app.component('UIcon', defineComponent({
      props: { name: { type: String, default: '' } },
      setup(props) {
        requireNuxtContext();
        return () => h('span', { 'data-icon': props.name });
      },
    }));
    app.component('NuxtPicture', defineComponent({
      props: { src: { type: String, default: '' }, alt: { type: String, default: '' } },
      setup(props) {
        requireNuxtContext();
        return () => h('picture', {}, h('img', props));
      },
    }));
    app.component('UAccordion', defineComponent({
      props: { items: { type: Array as PropType<{ label: string; content: string }[]>, required: true } },
      setup(props) {
        requireNuxtContext();
        return () => h('div', {}, props.items.map(item => h('details', {}, [
          h('summary', {}, item.label), h('p', {}, item.content),
        ])));
      },
    }));

    const grapesjs = require('grapesjs') as typeof import('grapesjs').default;
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
    for (const page of ['support', 'onigokko'] as const) {
      document.body.innerHTML = '<div id="canvas"></div><div id="layers"></div>';
      const initial = createDefaultPageDocument(page);
      editor = grapesjs.init({
        container: '#canvas', autorender: false, storageManager: false, telemetry: false, noticeOnUnload: false,
        panels: { defaults: [] },
        layerManager: { appendTo: '#layers', showWrapper: false, hidable: false },
        plugins: [(instance) => {
          instance.DomComponents.addType('clasteria-section', {
            model: { defaults: { droppable: false, editable: false, traits: [] } },
            view: {
              init() { this.listenTo(this.model, 'change:section', this.renderSection); },
              onRender() { this.renderSection(); },
              renderSection() {
                const section = this.model.get('section') as PageSection;
                render(createEditorSectionVNode(PageSectionView, section, app._context, page), this.el);
                this.el.setAttribute('data-editor-section', section.id);
              },
              removed() { render(null, this.el); },
            },
          });
        }],
      });
      const instance = editor;
      configureHomeEditorCanvas(instance, document);
      instance.setComponents(initial.sections.map(section => ({ type: 'clasteria-section', section })));
      instance.UndoManager.clear();
      const frameLoaded = new Promise<void>(resolve => instance.once('load', () => resolve()));
      instance.render();
      await frameLoaded;
      await nextTick();

      const frameDocument = instance.Canvas.getDocument();
      const wrappers = [...frameDocument.querySelectorAll('[data-editor-section]')];
      const hero = frameDocument.querySelector<HTMLElement>('.page-section-page-hero')!;
      expect(wrappers).toHaveLength(initial.sections.length);
      expect(wrappers.every(wrapper => wrapper.querySelector('.page-section'))).toBe(true);
      expect(hero.querySelector('h1')?.textContent).toBe(initial.sections[0]!.content.title);
      expect(hero.querySelector('picture img')?.getAttribute('src')).toBe(initial.sections[0]!.content.image);
      expect(document.querySelectorAll('#layers .gjs-layer').length).toBeGreaterThanOrEqual(initial.sections.length);
      expect(frameDocument.head.querySelector('[data-page-component*="content/PageSection.vue"]')?.textContent)
        .toContain('--page-background');
      expect(frameDocument.head.querySelector('[data-clasteria-canvas]')?.textContent).toContain('opacity: 1 !important');
      expect(frameDocument.documentElement.lang).toBe('ja');

      if (page === 'support') {
        const contact = initial.sections.find(section => section.kind === 'support-contact')!;
        const faq = initial.sections.find(section => section.kind === 'faq')!;
        expect(frameDocument.querySelector('.page-section-support-contact')?.textContent).toContain(contact.content.emailTitle);
        expect(frameDocument.querySelector('a[href="mailto:support@pixelsia.net"]')?.textContent)
          .toBe(contact.content.emailLabel);
        expect(frameDocument.querySelector('.page-section-faq summary')?.textContent).toBe(faq.content.question1);
      }
      else {
        const grid = initial.sections.find(section => section.kind === 'info-grid')!;
        expect(frameDocument.querySelector('.page-section-info-grid h3')?.textContent).toBe(grid.content.item1Title);
        expect(frameDocument.querySelector('.page-section-info-grid [data-icon]')?.getAttribute('data-icon'))
          .toBe(grid.content.item1Icon);
        expect(mounted.some(filename => filename.endsWith('/site/InfoCard.vue'))).toBe(true);
      }

      const model = instance.getComponents().at(0);
      const changed = {
        ...initial.sections[0]!, content: { ...initial.sections[0]!.content, title: `${page} edited title` },
        style: { accent: '#123456', background: '#fedcba', spacing: 'roomy' },
      };
      model.set('section', changed);
      await nextTick();
      expect(hero.querySelector('h1')?.textContent).toBe(changed.content.title);
      expect(hero.style.getPropertyValue('--page-accent')).toBe('#123456');
      expect(hero.style.getPropertyValue('--page-background')).toBe('#fedcba');
      expect(hero.classList.contains('page-spacing-roomy')).toBe(true);
      instance.UndoManager.undo();
      await nextTick();
      expect(hero.querySelector('h1')?.textContent).toBe(initial.sections[0]!.content.title);
      expect(hero.style.getPropertyValue('--page-accent')).toBe(initial.sections[0]!.style.accent);

      const lastWrapper = wrappers.at(-1)!;
      instance.getComponents().at(initial.sections.length - 1).remove();
      await nextTick();
      expect(lastWrapper.childNodes).toHaveLength(0);
      expect(lastWrapper.isConnected).toBe(false);
      const frame = instance.Canvas.getFrameEl();
      instance.destroy();
      editor = undefined;
      await nextTick();
      expect(frame.isConnected).toBe(false);
      expect(wrappers.every(wrapper => wrapper.childNodes.length === 0)).toBe(true);
      expect([...unmounted].sort()).toEqual([...mounted].sort());
      expect(errors.mock.calls, `${page}: Vue errors`).toEqual([]);
      expect(warnings.mock.calls, `${page}: Vue warnings or unresolved components`).toEqual([]);
    }
    expect(mounted.some(filename => filename.endsWith('/content/PageSection.vue'))).toBe(true);
    expect(mounted.some(filename => filename.endsWith('/site/PageHero.vue'))).toBe(true);
  }, 20_000);
});
