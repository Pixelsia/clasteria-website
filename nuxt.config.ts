// https://nuxt.com/docs/api/configuration/nuxt-config

import { defaultMaintenanceUrl, isUnpublishedRoute, resolveMaintenanceUrl, unpublishedRouteVariants } from './shared/utils/maintenance';
import { writeMaintenanceAssets } from './scripts/prebuild-maintenance';
import { insertWbrToNodes, insertWbrToContent } from './scripts/prebuild-typography';
import { ensureContentSymlink, generateContentSlug, detectContentOgImage, resolveContentImagePaths, contentHeading } from './scripts/prebuild-content';

const isDev = process.env.NODE_ENV === 'development';
// Editing is available in branch previews and explicit local builds, never Pages main.
const visualEditorEnabled = process.env.CF_PAGES_BRANCH !== 'main' && (isDev || Boolean(process.env.CF_PAGES_BRANCH) || process.env.NUXT_VISUAL_EDITOR === 'true');
const siteUrl = process.env.NUXT_SITE_URL || 'http://localhost:3000';
const maintenanceUrl = resolveMaintenanceUrl(
  process.env.NUXT_PUBLIC_MAINTENANCE_URL || defaultMaintenanceUrl,
  siteUrl,
);

// TODO: Pixelsia や Clasteria、Minecraft 関係のドメインを追加する
const imageDomains: Record<string, string> = {
  cloudinary: 'res.cloudinary.com',
  dropbox: 'dl.dropboxusercontent.com',
  firebase: 'firebasestorage.googleapis.com',
  github: 'raw.githubusercontent.com',
  githubimages: 'user-images.githubusercontent.com',
  imgbb: 'i.ibb.co',
  imgur: 'i.imgur.com',
  picsum: 'picsum.photos',
  postimages: 'i.postimg.cc',
  reddit: 'i.redd.it',
  twitter: 'pbs.twimg.com',
  unsplash: 'images.unsplash.com',
};

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  // https://nuxt.com/docs/4.x/getting-started/deployment#static-hosting
  ssr: true,

  runtimeConfig: {
    public: { maintenanceUrl, visualEditorEnabled },
  },

  devtools: {
    enabled: true,
    vscode: { enabled: true },
    timeline: { enabled: true },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'ja' },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
    },
  },
  css: [isDev ? '~/assets/main.dev.css' : '~/assets/main.css'],

  modules: [
    // core features
    '@nuxt/ui',
    // content management
    '@nuxt/image',
    '@nuxt/content',
    '@nuxtjs/seo',
    // utilities
    '@vueuse/nuxt',
    '@nuxt/scripts',
    // development tools
    '@nuxt/eslint',
    '@nuxt/test-utils',
  ],

  ui: {
    theme: {
      colors: ['primary', 'secondary', 'success', 'info', 'warning', 'error'],
    },
  },
  // TODO: ダークモード対応時に設定を削除
  colorMode: {
    preference: 'light',
    fallback: 'light',
  },

  image: {
    quality: 75,
    format: ['avif', 'webp'], // TODO: AVIF が Baseline Widely available になったら WebP を外す
    domains: [
      ...Object.values(imageDomains),
      'localhost',
    ],
    alias: Object.fromEntries(
      Object.entries(imageDomains).map(([key, domain]) => [key, `https://${domain}`]),
    ),
  },

  content: {
    build: {
      markdown: {
        contentHeading: false,
        highlight: {
          langs: [],
        },
      },
    },
  },

  site: {
    url: siteUrl,
    name: 'Clasteria',
    defaultLocale: 'ja_JP',
  },
  ogImage: {
    fonts: ['Noto+Sans+JP:400', 'Noto+Sans+JP:700'],
  },

  robots: { disallow: ['/editor', '/editor/'] },
  sitemap: { exclude: ['/editor', '/editor/**'] },

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: visualEditorEnabled ? ['/editor', '/editor/preview'] : [],
      failOnError: true,
      ignore: unpublishedRouteVariants,
    },
  },

  hooks: {
    // Keep the prototype source for later work without registering unavailable routes.
    'pages:extend': (pages) => {
      for (let index = pages.length - 1; index >= 0; index--) {
        if (isUnpublishedRoute(pages[index]!.path) || (!visualEditorEnabled && pages[index]!.path.startsWith('/editor'))) pages.splice(index, 1);
      }
    },
    'nitro:init': (nitro) => {
      nitro.hooks.hook('prerender:done', async () => {
        await writeMaintenanceAssets(
          nitro.options.output.publicDir, maintenanceUrl, siteUrl,
          visualEditorEnabled ? process.env.CF_PAGES_BRANCH || 'local-preview' : undefined,
        );
      });
    },
    'build:before': async () => {
      await ensureContentSymlink();
    },
    'vite:extendConfig': ({ vue: vueConfig }) => {
      if (!vueConfig) return;
      vueConfig.template ??= {};
      vueConfig.template.compilerOptions ??= {};
      vueConfig.template.compilerOptions.nodeTransforms ??= [];
      const vueNodeTransforms = vueConfig.template.compilerOptions.nodeTransforms;
      vueNodeTransforms.push(insertWbrToNodes as typeof vueNodeTransforms[number]);
    },
    'content:file:afterParse': async ({ file, content }) => {
      content.slug = generateContentSlug(content);
      await detectContentOgImage(content, file.dirname!);
      resolveContentImagePaths(content, file.dirname!);
      contentHeading(content);
      insertWbrToContent(content);
    },
  },
});
