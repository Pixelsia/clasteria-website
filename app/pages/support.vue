<script setup lang="ts">
useSiteReveal();

useSeoMeta({
  title: 'サポート',
  description: 'Pixels Support へのコンタクト導線とお問い合わせフォームの Coming soon 枠を表示します。',
});
</script>

<template>
  <article>
    <SitePageHero
      eyebrow="SUPPORT"
      title="Pixels Support へのコンタクト"
      description="HP 仕様書では、サポートページに Pixels Support へのコンタクトページとお問い合わせフォームを置くことが求められています。フォーム送信先は未決のため、初期実装では送信しません。"
      image="/images/clasteria/clasteria-hero.jpg"
      image-alt="サポートのイメージ"
    />

    <section class="bg-neutral-50">
      <UContainer class="grid gap-8 py-20">
        <div class="site-reveal rounded-lg border border-neutral-200 bg-white p-6 md:p-10">
          <SiteSectionHeader
            eyebrow="FAQ"
            title="よくある質問"
            description="確定している内容だけを掲載し、詳細が未決の項目は未決と明示します。"
          />
          <UAccordion
            class="mt-8"
            :items="faqItems"
          />
        </div>

        <div class="site-reveal rounded-lg border border-neutral-200 bg-white p-6 md:p-10">
          <p class="text-xs font-black uppercase tracking-widest text-primary-600">
            SUPPORT PLAN
          </p>
          <h2 class="mt-3 text-3xl font-black text-neutral-950">
            サブスクリプションサポート案内
          </h2>
          <p class="mt-4 max-w-3xl leading-8 text-neutral-700">
            ワイヤーフレームにあるサブスクリプションサポート案内の枠です。対象プラン、受付範囲、運用担当は未決のため、現在検討中として表示します。
          </p>
          <SiteTodoNotice
            class="mt-8"
            title="サポート案内の未決事項"
            :items="[unresolvedItems[1], unresolvedItems[3]]"
          />
        </div>

        <div class="site-reveal rounded-lg border border-neutral-200 bg-white p-6 md:p-10">
          <p class="text-xs font-black uppercase tracking-widest text-secondary-700">
            FORM TODO
          </p>
          <h2 class="mt-3 text-2xl font-black text-neutral-950">
            お問い合わせフォーム
          </h2>
          <p class="mt-3 leading-7 text-neutral-700">
            送信先と受付項目が未決のため、入力欄は表示確認用です。
          </p>
          <div class="mt-6 grid gap-4">
            <UInput
              placeholder="お名前"
              disabled
            />
            <UInput
              placeholder="メールアドレス"
              disabled
            />
            <UTextarea
              placeholder="お問い合わせ内容"
              disabled
              :rows="5"
            />
            <UButton
              color="secondary"
              disabled
              block
            >
              送信先未決
            </UButton>
          </div>
        </div>
      </UContainer>
    </section>
  </article>
</template>
