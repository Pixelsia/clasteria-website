import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import sharp from 'sharp';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import * as vue from 'vue';
import type { Component } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { compileScript, parse } from 'vue/compiler-sfc';
import { primaryNavItems, relatedServices, siteNavItems } from '../../utils/siteContent';

const { JSDOM } = createRequire(import.meta.url)('jsdom') as {
  JSDOM: new (html: string) => { window: Window & typeof globalThis };
};

async function renderFooter() {
  const path = resolve(import.meta.dirname, 'Footer.vue');
  const { descriptor } = parse(readFileSync(path, 'utf8'), { filename: path });
  const script = compileScript(descriptor, { id: path, inlineTemplate: true }).content;
  const executable = ts.transpileModule(script, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {} as { default: Component };
  const evaluate = new Function('require', 'exports', 'primaryNavItems', 'relatedServices', 'siteNavItems', executable);
  evaluate((name: string) => {
    if (name === 'vue') return vue;
    throw new Error(`Unexpected component dependency: ${name}`);
  }, exports, primaryNavItems, relatedServices, siteNavItems);

  const app = vue.createSSRApp(exports.default);
  app.component('UFooter', vue.defineComponent({
    setup: (_, { slots }) => () => vue.h('footer', [slots.top?.(), slots.bottom?.()]),
  }));
  app.component('UFooterColumns', vue.defineComponent({
    setup: (_, { slots }) => () => vue.h('div', slots.left?.()),
  }));
  for (const [name, tag] of [['UContainer', 'div'], ['NuxtImg', 'img']] as const) {
    app.component(name, vue.defineComponent({
      setup: (_, { slots }) => () => vue.h(tag, slots.default?.()),
    }));
  }
  return new JSDOM(await renderToString(app)).window.document;
}

describe('footer branding', () => {
  it('renders both Pixelsia logos in their original colors at the existing responsive sizes', async () => {
    const document = await renderFooter();
    const logos = document.querySelectorAll('footer img[alt="Pixelsia"]');
    expect(logos).toHaveLength(2);
    for (const logo of logos) {
      expect(logo.getAttribute('src')).toBe('/images/pixelsia_header_logo.png');
      expect(logo.className.split(' ')).toEqual(['h-6', 'w-auto', 'object-contain', 'md:h-7']);
      for (let element: Element | null = logo; element; element = element.parentElement) {
        expect(element.className).not.toMatch(/brightness-|invert|grayscale|opacity-/);
        expect(element.getAttribute('style') || '').not.toMatch(/filter|opacity/);
      }
    }
  });

  it('uses the existing full-color transparent Pixelsia asset', async () => {
    const { data, info } = await sharp(resolve(import.meta.dirname, '../../../public/images/pixelsia_header_logo.png'))
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(info.channels).toBe(4);
    let hasTransparentPixel = false;
    let hasGreenPixel = false;
    for (let offset = 0; offset < data.length; offset += 4) {
      if (data[offset + 3] === 0) hasTransparentPixel = true;
      if (data[offset + 3]! > 250
        && data[offset + 1]! > data[offset]! + 20
        && data[offset + 1]! > data[offset + 2]! + 20) hasGreenPixel = true;
    }
    expect(hasTransparentPixel).toBe(true);
    expect(hasGreenPixel).toBe(true);
  });
});
