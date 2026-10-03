import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import * as vue from 'vue';
import type { Component, PropType } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { compileScript, parse } from 'vue/compiler-sfc';
import { createEditorSectionVNode } from '../composables/editorSection';
import { allowedPageSectionKinds, createPageSection, isMultilinePageField, pageDefinitions } from './pageDocument';
import type { PageDocument } from './pageDocument';
import * as homeDocument from './homeDocument';
import * as siteContent from './siteContent';
import { formatDate } from './date';

const { JSDOM } = createRequire(import.meta.url)('jsdom') as {
  JSDOM: new (html: string) => { window: Window & typeof globalThis };
};
const appRoot = resolve(import.meta.dirname, '..');
const components = new Map<string, Component>();
const useArticlesList = async () => vue.ref({ articles: [], total: 0 });

function loadComponent(path: string): Component {
  const cached = components.get(path);
  if (cached) return cached;
  const { descriptor, errors } = parse(readFileSync(path, 'utf8'), { filename: path });
  expect(errors, path).toEqual([]);
  const script = compileScript(descriptor, { id: path, inlineTemplate: true }).content;
  const executable = ts.transpileModule(script, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {} as { default: Component };
  const dependencies: Record<string, unknown> = {
    'vue': vue,
    '~/utils/homeDocument': homeDocument,
    '~/utils/siteContent': siteContent,
    '~/utils/date': { formatDate },
    '~/composables/articles': { useArticlesList },
    '~/composables/images': { useOgImageSrc: () => '' },
    '~/composables/siteReveal': { useSiteReveal: () => {} },
  };
  new Function('require', 'exports', 'computed', 'ref', 'useArticlesList', 'relatedServices', executable)((name: string) => {
    if (name in dependencies) return dependencies[name];
    if (name.startsWith('~/') && name.endsWith('.vue')) {
      return { default: loadComponent(resolve(appRoot, name.slice(2))) };
    }
    throw new Error(`Unexpected component dependency: ${name}`);
  }, exports, vue.computed, vue.ref, useArticlesList, siteContent.relatedServices);
  components.set(path, exports.default);
  return exports.default;
}

async function renderText(view: 'canvas' | 'preview' | 'public', document: PageDocument) {
  const warnings: string[] = [];
  const sectionView = loadComponent(resolve(appRoot, 'components/editor/PageSection.vue'));
  const documentView = loadComponent(resolve(appRoot, `components/${view === 'public' ? 'content' : 'editor'}/PageDocument.vue`));
  const app = vue.createSSRApp(vue.defineComponent({
    setup: () => () => view === 'canvas'
      ? vue.h('div', document.sections.map(section => createEditorSectionVNode(sectionView, section, app._context, document.page)))
      : vue.h(documentView, { document }),
  }));
  app.config.warnHandler = message => warnings.push(message);
  Object.defineProperty(app.config.globalProperties, 'relatedServices', { value: siteContent.relatedServices });
  const actualComponents = {
    TopHero: 'top/Hero', TopAbout: 'top/About', TopNews: 'top/News', SiteCtaBand: 'site/CtaBand', SiteSectionHeader: 'site/SectionHeader',
  };
  for (const [name, path] of Object.entries(actualComponents)) {
    app.component(name, loadComponent(resolve(appRoot, `components/${path}.vue`)));
  }
  for (const name of ['UContainer', 'UButton', 'UIcon', 'NuxtLink', 'NuxtPicture', 'UInput', 'UPagination', 'PostCard']) {
    app.component(name, vue.defineComponent({ setup: (_, { slots }) => () => vue.h('div', slots.default?.()) }));
  }
  // The installed Nuxt UI Accordion exposes label/body UI slots. Preserve those
  // boundaries in this adapter; full native Accordion interaction belongs to E2E.
  app.component('UAccordion', vue.defineComponent({
    props: {
      items: { type: Array as PropType<{ label: string; content: string }[]>, required: true },
      ui: { type: Object as PropType<{ label: string; body: string }>, required: true },
    },
    setup: props => () => vue.h('div', props.items.map(item => vue.h('details', [
      vue.h('summary', { class: props.ui.label }, item.label), vue.h('p', { class: props.ui.body }, item.content),
    ]))),
  }));
  const html = await renderToString(app);
  expect(warnings, `${view}: no unresolved components`).toEqual([]);
  return html;
}

describe('multiline text across all editor render paths', () => {
  it.each(['canvas', 'preview', 'public'] as const)('preserves explicit breaks and escapes HTML in every prose field in %s', async (view) => {
    for (const page of pageDefinitions) {
      const document: PageDocument = {
        version: 1, page: page.id,
        sections: allowedPageSectionKinds(page.id).map((kind, index) => createPageSection(kind, `section-${index}`)),
      };
      const values: string[] = [];
      for (const section of document.sections) {
        for (const key of Object.keys(section.content)) {
          if (!isMultilinePageField(section.kind, key)) continue;
          const value = `${section.kind}.${key} 一行目\n二行目\n\n空行の後 <br> <script>alert(1)</script>`;
          section.content[key] = value;
          values.push(value);
        }
      }
      const original = structuredClone(document);
      const dom = new JSDOM(await renderText(view, document));
      try {
        const elements = [...dom.window.document.querySelectorAll('*')];
        for (const value of values) {
          const leaves = elements.filter(element => !element.children.length && element.textContent?.trim() === value);
          expect(leaves.length, `${page.id}: ${value.split('\n')[0]} renders`).toBeGreaterThan(0);
          for (const element of leaves) {
            expect(element.closest('.whitespace-pre-line'), `${page.id}: ${value.split('\n')[0]} keeps line breaks`).not.toBeNull();
          }
        }
        expect(dom.window.document.querySelector('script')).toBeNull();
        expect(dom.window.document.querySelectorAll('br')).toHaveLength(page.id === 'home' ? 1 : 0);
        expect(document).toEqual(original);
      }
      finally { dom.window.close(); }
    }
  });
});
