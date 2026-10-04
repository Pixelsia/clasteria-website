<script setup lang="ts">
import type { HomeSection } from '~/utils/homeDocument';

defineProps<{ section: HomeSection; aboutId?: string; imageProvider?: 'none' }>();
</script>

<template>
  <div
    class="home-section"
    :class="[`home-section-${section.kind}`, `home-spacing-${section.style.spacing}`]"
    :style="{ '--home-accent': section.style.accent, '--home-background': section.style.background, '--ui-primary': section.style.button ?? '#26715b' }"
    :data-section-id="section.id"
  >
    <TopHero
      v-if="section.kind === 'hero'"
      :content="section.content"
      :about-id="aboutId"
      :image-provider="imageProvider"
    />
    <TopAbout
      v-else-if="section.kind === 'about'"
      :content="section.content"
      :section-id="section.id"
    />
    <TopNews
      v-else-if="section.kind === 'news'"
      :content="section.content"
    />
    <SiteCtaBand
      v-else-if="section.kind === 'contact'"
      :eyebrow="section.content.eyebrow!"
      :title="section.content.title!"
      :description="section.content.description!"
      :primary-label="section.content.primaryLabel!"
      :primary-to="section.content.primaryTo!"
    />
  </div>
</template>
