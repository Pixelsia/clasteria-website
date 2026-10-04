<script setup lang="ts">
import ContentArticleList from '~/components/content/ArticleList.vue';
import ContentArticleMeta from '~/components/content/ArticleMeta.vue';
import ContentFaq from '~/components/content/Faq.vue';
import ContentInfoGrid from '~/components/content/InfoGrid.vue';
import ContentLoginForm from '~/components/content/LoginForm.vue';
import ContentRanking from '~/components/content/Ranking.vue';
import ContentRegisterForm from '~/components/content/RegisterForm.vue';
import ContentSplitContent from '~/components/content/SplitContent.vue';
import ContentSupportContact from '~/components/content/SupportContact.vue';
import ContentSupportGuide from '~/components/content/SupportGuide.vue';
import SiteCtaBand from '~/components/site/CtaBand.vue';
import SitePageHero from '~/components/site/PageHero.vue';
import SiteTodoNotice from '~/components/site/TodoNotice.vue';
import TopHomeSection from '~/components/top/HomeSection.vue';
import type { HomeSection } from '~/utils/homeDocument';
import type { PageDocument, PageSection } from '~/utils/pageDocument';

const props = defineProps<{ section: PageSection; page?: PageDocument['page']; aboutId?: string; editorPreview?: boolean }>();
const homeSection = computed(() => ['hero', 'about', 'news', 'contact'].includes(props.section.kind)
  ? props.section as HomeSection
  : undefined);
const content = computed(() => props.section.content);
</script>

<template>
  <TopHomeSection
    v-if="homeSection"
    :section="homeSection"
    :about-id="aboutId"
    :image-provider="editorPreview ? 'none' : undefined"
  />
  <div
    v-else
    :id="section.id"
    class="page-section scroll-mt-24"
    :class="[`page-section-${section.kind}`, `page-spacing-${section.style.spacing}`]"
    :data-section-id="section.id"
    :data-page="page"
    :style="{
      '--page-accent': section.style.accent,
      '--page-background': section.style.background,
      '--page-button': section.style.button ?? '#26715b',
      '--page-glow': `color-mix(in srgb, ${section.style.accent} 18%, transparent)`,
      '--page-background-overlay': `color-mix(in srgb, ${section.style.background} 55%, transparent)`,
      '--page-background-overlay-middle': `color-mix(in srgb, ${section.style.background} 40%, transparent)`,
      '--page-background-overlay-end': `color-mix(in srgb, ${section.style.background} 65%, transparent)`,
    }"
  >
    <SitePageHero
      v-if="section.kind === 'page-hero'"
      class="page-content-hero"
      :image-provider="editorPreview ? 'none' : undefined"
      :eyebrow="content.eyebrow!"
      :title="content.title!"
      :description="content.description!"
      :image="content.image!"
      :image-alt="content.imageAlt!"
    >
      <template
        v-if="(content.primaryLabel && content.primaryTo) || (content.secondaryLabel && content.secondaryTo)"
        #actions
      >
        <UButton
          v-if="content.primaryLabel && content.primaryTo"
          :to="content.primaryTo"
          color="primary"
          size="xl"
          trailing-icon="i-heroicons-arrow-right"
        >
          {{ content.primaryLabel }}
        </UButton>
        <UButton
          v-if="content.secondaryLabel && content.secondaryTo"
          :to="content.secondaryTo"
          color="neutral"
          variant="outline"
          size="xl"
        >
          {{ content.secondaryLabel }}
        </UButton>
      </template>
    </SitePageHero>
    <ContentSupportContact
      v-else-if="section.kind === 'support-contact'"
      :content="content"
    />
    <ContentSupportGuide
      v-else-if="section.kind === 'support-guide'"
      :content="content"
    />
    <ContentFaq
      v-else-if="section.kind === 'faq'"
      :content="content"
    />
    <ContentArticleList
      v-else-if="section.kind === 'article-list'"
      :content="content"
    />
    <ContentInfoGrid
      v-else-if="section.kind === 'info-grid'"
      :content="content"
    />
    <ContentSplitContent
      v-else-if="section.kind === 'split-content'"
      :content="content"
      :image-provider="editorPreview ? 'none' : undefined"
    />
    <SiteCtaBand
      v-else-if="section.kind === 'cta'"
      class="page-content-cta"
      :eyebrow="content.eyebrow!"
      :title="content.title!"
      :description="content.description!"
      :primary-label="content.primaryLabel!"
      :primary-to="content.primaryTo!"
      :secondary-label="content.secondaryLabel"
      :secondary-to="content.secondaryTo"
    />
    <section
      v-else-if="section.kind === 'availability'"
      class="border-b border-primary-100"
    >
      <UContainer
        data-page-container
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p class="whitespace-pre-line font-bold text-primary-800">
            {{ content.title }}
          </p>
          <p class="whitespace-pre-line mt-1 text-sm leading-7 text-neutral-700">
            {{ content.description }}
          </p>
        </div>
        <UButton
          :to="content.primaryTo"
          color="primary"
          variant="outline"
          class="shrink-0 self-start"
          trailing-icon="i-heroicons-arrow-right"
        >
          {{ content.primaryLabel }}
        </UButton>
      </UContainer>
    </section>
    <ContentLoginForm
      v-else-if="section.kind === 'login-form'"
      :content="content"
    />
    <ContentRegisterForm
      v-else-if="section.kind === 'register-form'"
      :content="content"
    />
    <ContentRanking
      v-else-if="section.kind === 'ranking'"
      :content="content"
    />
    <UContainer
      v-else-if="section.kind === 'notice'"
      as="section"
      data-page-container
    >
      <SiteTodoNotice
        class="site-reveal"
        :title="content.title"
        :items="[{ title: content.itemTitle!, body: content.itemBody! }]"
      />
    </UContainer>
    <ContentArticleMeta
      v-else-if="section.kind === 'article-meta'"
      :content="content"
    />
    <UContainer
      v-else-if="section.kind === 'article-heading'"
      as="section"
      data-page-container
    >
      <h2 class="mx-auto max-w-4xl whitespace-pre-line text-3xl font-black leading-tight text-neutral-950">
        {{ content.title }}
      </h2>
    </UContainer>
    <UContainer
      v-else-if="section.kind === 'article-paragraph'"
      as="section"
      data-page-container
    >
      <p class="mx-auto max-w-4xl whitespace-pre-line text-base leading-8 text-neutral-700 md:text-lg">
        {{ content.body }}
      </p>
    </UContainer>
  </div>
</template>

<style scoped>
.page-section {
  --ui-primary: var(--page-button);
  --page-padding: 5rem;

  background-color: var(--page-background);
  overflow-wrap: anywhere;
}

.page-spacing-compact {
  --page-padding: 2rem;
}

.page-spacing-roomy {
  --page-padding: 7rem;
}

.page-section :deep([data-page-container]),
.page-section :deep(.page-content-cta > div:last-child) {
  padding-block: var(--page-padding-start, var(--page-padding)) var(--page-padding-end, var(--page-padding));
}

.page-section :deep(p[class*="tracking-widest"]),
.page-section :deep([class*="text-primary-"]) {
  color: var(--page-accent);
}

.page-section :deep(.page-content-hero) {
  background-color: var(--page-background);
}

.page-section :deep(.page-content-hero > .bg-gradient-to-b) {
  background-image: linear-gradient(
    to bottom,
    var(--page-background-overlay),
    var(--page-background-overlay-middle),
    var(--page-background-overlay-end)
  );
}

.page-section :deep(.page-content-hero > div:last-child) {
  padding-block: calc(var(--page-padding) + 1rem);
}

.page-spacing-compact :deep(.page-content-hero > div:last-child) {
  min-height: 20rem;
}

.page-spacing-roomy :deep(.page-content-hero > div:last-child) {
  min-height: 36rem;
}

.page-section :deep(.page-content-cta) {
  background:
    radial-gradient(circle at 84% 18%, var(--page-glow), transparent 24rem),
    linear-gradient(135deg, var(--page-background), var(--page-background));
}

.page-section-support-contact.page-spacing-normal {
  --page-padding-start: 4rem;
  --page-padding-end: 0rem;
}

.page-section-support-guide.page-spacing-normal {
  --page-padding-start: 3rem;
  --page-padding-end: 0rem;
}

.page-section-support-guide.page-spacing-normal[data-page="access"] {
  --page-padding-end: 5rem;
}

.page-section-faq.page-spacing-normal {
  --page-padding: 4rem;
}

@media (width >= 48rem) {
  .page-section-support-contact.page-spacing-normal {
    --page-padding-start: 5rem;
  }

  .page-section-faq.page-spacing-normal {
    --page-padding-end: 5rem;
  }
}

.page-section-availability.page-spacing-normal {
  --page-padding: 1.5rem;
}

.page-section-availability.page-spacing-compact {
  --page-padding: 1rem;
}

.page-section-availability.page-spacing-roomy {
  --page-padding: 3rem;
}

.page-section-article-heading :deep(h2),
.page-section-article-list :deep(h2) {
  color: var(--page-accent);
}

.page-section-article-paragraph :deep(p) {
  border-inline-start: 3px solid var(--page-accent);
  padding-inline-start: 1.25rem;
}

.page-section-article-heading.page-spacing-normal,
.page-section-article-paragraph.page-spacing-normal {
  --page-padding: 2rem;
}

.page-section-article-heading.page-spacing-compact,
.page-section-article-paragraph.page-spacing-compact {
  --page-padding: 1rem;
}

.page-section-article-heading.page-spacing-roomy,
.page-section-article-paragraph.page-spacing-roomy {
  --page-padding: 3rem;
}
</style>
