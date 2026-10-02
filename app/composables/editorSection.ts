import { h, Suspense } from 'vue';
import type { AppContext, Component } from 'vue';
import type { HomeSection } from '~/utils/homeDocument';

/** Give the rendered component, not the non-component Suspense boundary, Nuxt's context. */
export function createEditorSectionVNode(view: Component, section: HomeSection, appContext: AppContext) {
  const content = h(view, { section, aboutId: 'about' });
  content.appContext = appContext;
  return h(Suspense, {}, {
    default: () => content,
    fallback: () => h('p', { role: 'status' }, 'セクションを読み込んでいます…'),
  });
}
