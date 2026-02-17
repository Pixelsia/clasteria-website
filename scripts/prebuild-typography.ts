import { loadDefaultJapaneseParser } from 'budoux';
import { type NodeTransform, type TemplateChildNode, NodeTypes, Namespaces, ElementTypes } from '@vue/compiler-core';
import { visit } from 'minimark';
import type { MinimarkElement, MinimarkNode, MinimarkTree, ParsedContentFile } from '@nuxt/content';

function intersperse<T, U>(array: T[], separator: U): (T | U)[] {
  return array.flatMap((item, index) => index === 0 ? [item] : [separator, item]);
}

const jaParser = loadDefaultJapaneseParser();

// TODO: `word-break: auto-phrase` が Baseline Widely available になったら削除する
export function insertWbrToNodes(node: Parameters<NodeTransform>[0]) {
  if (!('children' in node)) return;
  if (!Array.isArray(node.children)) return;
  if (node.type === NodeTypes.COMPOUND_EXPRESSION) return;
  const childrenWithWbr = node.children.flatMap((child): TemplateChildNode[] => {
    if (child.type !== NodeTypes.TEXT) return [child];
    if (!child.content.trim()) return [child];
    return intersperse(
      jaParser.parse(child.content).map(word => ({ ...child, content: word })),
      {
        type: NodeTypes.ELEMENT,
        ns: Namespaces.HTML,
        tag: 'wbr',
        tagType: ElementTypes.ELEMENT,
        props: [],
        children: [],
        loc: child.loc,
        codegenNode: undefined,
      } as TemplateChildNode,
    );
  });
  node.children.splice(0, node.children.length, ...childrenWithWbr);
};

// TODO: `word-break: auto-phrase` が Baseline Widely available になったら削除する
export function insertWbrToContent(content: ParsedContentFile) {
  visit(
    content.body as MinimarkTree,
    (node): node is MinimarkElement => Array.isArray(node),
    (node) => {
      if (['code', 'pre', 'script', 'style'].includes(node[0])) return;
      const children: MinimarkNode[] = node.slice(2);
      const childrenWithWbr = children.flatMap((child): MinimarkNode[] => {
        if (typeof child !== 'string') return [child];
        if (!child.trim()) return [child];
        return intersperse(jaParser.parse(child), ['wbr', {}]);
      });
      node.splice(2, node.length - 2, ...childrenWithWbr);
    },
  );
}
