// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: {
    enabled: true,
    vscode: { enabled: true },
    timeline: { enabled: true },
  },

  modules: [
    // core features
    '@nuxt/ui',
    // content management
    '@nuxt/image',
    '@nuxt/content',
    // utilities
    '@vueuse/nuxt',
    '@nuxt/scripts',
    // development tools
    '@nuxt/eslint',
    '@nuxt/test-utils',
  ],

  css: [
    process.env.NODE_ENV === 'development' ? '~/assets/main.dev.css' : '~/assets/main.css',
  ],

  image: {
    quality: 75,
    format: ['avif', 'webp'], // TODO: 2027 年になったら WebP を外す
  },

  // TODO: ダークモード対応時に設定を削除
  colorMode: {
    preference: 'light',
    fallback: 'light',
  },

  ui: {
    theme: {
      colors: ['primary', 'secondary', 'success', 'info', 'warning', 'error'],
    },
  },

  nitro: {
    publicAssets: [
      {
        dir: 'content-demo',
        baseURL: '/assets',
        maxAge: 86400 * 365,
      },
    ],
  },
});
