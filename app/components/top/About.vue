<script setup lang="ts">
import { homeSectionTemplates } from '~/utils/homeDocument';
withDefaults(defineProps<{ content?: Record<string, string>; sectionId?: string }>(), {
  content: () => ({ ...homeSectionTemplates.about.content }),
  sectionId: 'about',
});
</script>

<template>
  <UContainer
    :id="sectionId"
    as="section"
    class="scroll-mt-24 py-16 md:py-20"
  >
    <div class="site-reveal grid gap-10 md:grid-cols-2 md:items-center">
      <SiteSectionHeader
        :eyebrow="content.eyebrow!"
        :title="content.title!"
        :description="content.description!"
      />
      <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-6 md:p-10">
        <h3 class="whitespace-pre-line text-2xl font-black text-neutral-950">
          {{ content.cardTitle }}
        </h3>
        <p class="whitespace-pre-line mt-4 leading-8 text-neutral-700">
          {{ content.cardBody }}
        </p>
        <div class="mt-6 flex flex-wrap gap-3">
          <UButton
            :to="content.primaryTo"
            trailing-icon="i-heroicons-arrow-right"
          >
            {{ content.primaryLabel }}
          </UButton>
          <UButton
            :to="content.secondaryTo"
            variant="outline"
          >
            {{ content.secondaryLabel }}
          </UButton>
        </div>
      </div>
    </div>
    <section class="site-reveal mt-12 border-t border-neutral-200 pt-8">
      <p class="text-xs font-black tracking-widest text-primary-600">
        RELATED SERVICE
      </p>
      <div class="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="text-2xl font-black text-neutral-950">
            関連サービス
          </h3>
          <p class="mt-2 text-sm leading-7 text-neutral-600">
            CodingCraft は外部サイトで開きます。
          </p>
        </div>
        <UButton
          v-for="service in relatedServices"
          :key="service.to"
          :to="service.to"
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          trailing-icon="i-heroicons-arrow-up-right"
          class="self-start"
        >
          {{ service.label }} を開く（外部サイト）
        </UButton>
      </div>
    </section>
  </UContainer>
</template>
