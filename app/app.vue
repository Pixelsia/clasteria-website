<script setup lang="ts">
const siteConfig = useSiteConfig();
const { seo, noscriptHtml } = useAppConfig();

useHead({
  title: seo.defaultTitle,
  titleTemplate: (title?: string) => title ? `${title} - ${siteConfig.name}` : seo.defaultTitle,
  noscript: [{ innerHTML: noscriptHtml, tagPosition: 'bodyClose' }],
});

useSeoMeta({
  description: seo.description,
  twitterCard: 'summary',
  twitterSite: `@${seo.twitter}`,
  themeColor: seo.theme,
  mobileWebAppCapable: 'yes',
  appleMobileWebAppCapable: 'yes',
  appleMobileWebAppStatusBarStyle: 'default',
  appleMobileWebAppTitle: siteConfig.name,
});

defineOgImageComponent('NuxtSeo');
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
