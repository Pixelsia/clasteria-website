import type { PageSection } from './pageDocument';

const normalized = (value: string) => value.replace(/\s+/g, ' ').trim();

/** Annotate only exact rendered text matches; never edit HTML, URLs or hidden metadata. */
export function markInlineText(root: HTMLElement, section: PageSection) {
  root.querySelectorAll('[data-editor-field]').forEach((node) => {
    node.removeAttribute('data-editor-field');
    node.removeAttribute('title');
  });
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('h1,h2,h3,h4,p,span,a,button,li,dt,dd'));
  for (const [key, value] of Object.entries(section.content)) {
    if (!value || ['image', 'imageAlt', 'publicationStatus', 'slug', 'date', 'emailLabel'].includes(key)
      || (section.kind === 'article-meta' && key === 'brand') || key.endsWith('To') || key.endsWith('Icon')) continue;
    const matches = nodes.filter(node => normalized(node.textContent || '') === normalized(value)
      && !node.querySelector('input,textarea,select'));
    const leaves = matches.filter(node => !matches.some(other => other !== node && node.contains(other)));
    // Ambiguous identical labels remain available in the inspector.
    if (leaves.length !== 1 || leaves[0]!.hasAttribute('data-editor-field')) continue;
    leaves[0]!.dataset.editorField = key;
    leaves[0]!.title = 'ダブルクリックで文章を編集';
  }
}

export function inlineTextValue(element: HTMLElement, multiline: boolean) {
  const text = element.innerText.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');
  return multiline ? text : text.replace(/\n/g, ' ');
}
