import { h, Suspense } from 'vue';
import type { AppContext, Component } from 'vue';
import type { PageSection, PageId } from '~/utils/pageDocument';

/** Nuxt のコンテキストは Suspense 境界ではなく、描画するコンポーネントに渡す。 */
export function createEditorSectionVNode(view: Component, section: PageSection, appContext: AppContext, page?: PageId) {
  const content = h(view, { section, page, aboutId: 'about' });
  content.appContext = appContext;
  return h(Suspense, {}, {
    default: () => content,
    fallback: () => h('p', { role: 'status' }, 'セクションを読み込んでいます…'),
  });
}
