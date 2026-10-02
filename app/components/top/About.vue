<template>
  <UContainer
    id="about"
    as="section"
    class="scroll-mt-24 py-16 md:py-20"
  >
    <div class="site-reveal grid gap-10 md:grid-cols-2 md:items-center">
      <SiteSectionHeader
        eyebrow="ABOUT CLASTERIA"
        title="Minecraft から広がる、遊びの世界。"
        description="Clasteria は Pixelsia が制作する Minecraft のプロジェクトです。このサイトでは、お知らせやお問い合わせ窓口をご案内しています。"
      />
      <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-6 md:p-10">
        <h3 class="text-2xl font-black text-neutral-950">
          Clasteria の情報はこちらから
        </h3>
        <p class="mt-4 leading-8 text-neutral-700">
          お知らせの確認はニュースへ。ご質問やご相談は、メール・Discord の窓口をご利用ください。
        </p>
        <div class="mt-6 flex flex-wrap gap-3">
          <UButton
            to="/articles"
            trailing-icon="i-heroicons-arrow-right"
          >
            ニュースを見る
          </UButton>
          <UButton
            to="/support"
            variant="outline"
          >
            お問い合わせ
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
