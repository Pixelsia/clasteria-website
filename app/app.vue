<script setup lang="ts">
const { seo, ui } = useAppConfig();
const route = useRoute();

const titleTemplate = (title?: string) => title ? `${title} - ${seo.name}` : seo.defaultTitle;
const canonicalUrl = computed(() => new URL(route.path, seo.url).toString());

useSeoMeta({
  charset: 'utf-8',
  viewport: 'width=device-width, initial-scale=1',
  titleTemplate,
  description: seo.description,
  ogType: 'website',
  ogSiteName: seo.name,
  ogTitle: () => titleTemplate(route.meta.title as string | undefined),
  ogDescription: seo.description,
  ogLocale: 'ja_JP',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary',
  twitterSite: `@${seo.twitter}`,
  themeColor: ui.colors.primary,
  mobileWebAppCapable: 'yes',
  appleMobileWebAppCapable: 'yes',
  appleMobileWebAppStatusBarStyle: 'default',
  appleMobileWebAppTitle: seo.name,
  ogImage: [], // TODO: Add thumbnail image
});

useHead({
  noscript: [
    {
      innerHTML: `
        <div class="fixed inset-x-0 bottom-0 z-[6000000] bg-red-600 p-4 text-center text-white">
          <strong class="font-bold">
            このサイトのすべての機能をご利用になるには、JavaScript が必要です。
            <br>
            JavaScript is required to access all features of this site.
            <br>
            ブラウザの設定で JavaScript を有効にし、ページを再読み込みしてください。
            <br>
            Please enable JavaScript in your browser settings and reload the page.
          </strong>
        </div>
      `.replaceAll(/\s+/g, ' ').trim(),
      tagPosition: 'bodyClose',
    },
  ],
});
</script>

<template>
  <Head>
    <Html lang="ja" />
    <Link
      rel="canonical"
      :href="canonicalUrl"
    />
  </Head>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
