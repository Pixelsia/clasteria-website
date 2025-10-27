<script setup lang="ts">
const { seo, theme } = useAppConfig();
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
  themeColor: theme.primaryColor,
  mobileWebAppCapable: 'yes',
  appleMobileWebAppCapable: 'yes',
  appleMobileWebAppStatusBarStyle: 'default',
  appleMobileWebAppTitle: seo.name,
  ogImage: [], // TODO: Add thumbnail image
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
  <noscript>
    <NoscriptPrompt />
  </noscript>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
