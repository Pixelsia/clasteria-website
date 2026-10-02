<script setup lang="ts">
useSiteReveal();

const emailCopied = ref(false);
const copyFailed = ref(false);

async function copyEmail() {
  copyFailed.value = false;
  try {
    await navigator.clipboard.writeText(supportEmail);
    emailCopied.value = true;
  }
  catch {
    copyFailed.value = true;
  }
}

useSeoMeta({
  title: 'お問い合わせ',
  description: 'Clasteria に関するご質問やご相談は、メールまたは Pixelsia Discord へ。',
});
</script>

<template>
  <article>
    <SitePageHero
      eyebrow="SUPPORT"
      title="お手伝いできることは、ありますか。"
      description="ゲームへの参加、ご質問、不具合のご報告。Clasteria に関するお問い合わせはこちらから。"
      image="/images/clasteria/clasteria-hero.jpg"
      image-alt="Clasteria の世界を描いたイメージ"
    />

    <UContainer
      as="section"
      class="py-16 md:py-20"
    >
      <div class="grid gap-6 md:grid-cols-2">
        <section class="site-reveal flex flex-col rounded-lg border border-neutral-200 bg-white p-6 md:p-10">
          <UIcon
            name="i-heroicons-envelope"
            class="size-8 text-primary-600"
          />
          <h2 class="mt-5 text-2xl font-black text-neutral-950">
            メールでお問い合わせ
          </h2>
          <p class="mt-4 leading-8 text-neutral-700">
            ご相談内容をまとめて送りたいときはこちらへ。ご利用のメールアプリから送信できます。
          </p>
          <a
            :href="`mailto:${supportEmail}`"
            class="mt-5 break-all text-lg font-bold text-primary-700 underline underline-offset-4"
          >
            {{ supportEmail }}
          </a>
          <div class="mt-6 flex flex-wrap gap-3">
            <UButton
              :to="`mailto:${supportEmail}`"
              size="lg"
              icon="i-heroicons-envelope"
            >
              メールを作成
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              size="lg"
              icon="i-heroicons-clipboard"
              @click="copyEmail"
            >
              {{ emailCopied ? 'コピーしました' : 'アドレスをコピー' }}
            </UButton>
          </div>
          <p
            role="status"
            class="mt-3 text-sm text-neutral-600"
          >
            <template v-if="copyFailed">
              コピーできませんでした。上のアドレスを選択してコピーしてください。
            </template>
            <template v-else-if="emailCopied">
              メールアドレスをコピーしました。
            </template>
            <template v-else>
              送信前に宛先と内容をご確認ください。
            </template>
          </p>
        </section>

        <section class="site-reveal flex flex-col rounded-lg border border-neutral-200 bg-neutral-50 p-6 md:p-10">
          <UIcon
            name="i-heroicons-chat-bubble-left-right"
            class="size-8 text-primary-600"
          />
          <h2 class="mt-5 text-2xl font-black text-neutral-950">
            Discord でお問い合わせ
          </h2>
          <p class="mt-4 leading-8 text-neutral-700">
            Pixelsia の Discord でもご連絡いただけます。参加後は、サーバー内の案内をご確認ください。
          </p>
          <div class="mt-6">
            <UButton
              :to="supportDiscord"
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              trailing-icon="i-heroicons-arrow-up-right"
            >
              Pixelsia Discord を開く
            </UButton>
          </div>
          <p class="mt-3 text-sm leading-7 text-neutral-600">
            別のタブで招待ページを開きます。参加には Discord アカウントが必要です。
          </p>
        </section>
      </div>

      <section class="site-reveal mt-12 rounded-lg border border-neutral-200 bg-neutral-50 p-6 md:p-10">
        <SiteSectionHeader
          eyebrow="BEFORE YOU CONTACT"
          title="お問い合わせの前に"
          description="内容を確認しやすくするために、次のことを添えてお知らせください。"
        />
        <ul class="mt-6 grid gap-4 text-neutral-700 md:grid-cols-3">
          <li class="rounded-lg border border-neutral-200 bg-white p-5">
            ゲーム名やページ名
          </li>
          <li class="rounded-lg border border-neutral-200 bg-white p-5">
            起きたこと・確認したいこと
          </li>
          <li class="rounded-lg border border-neutral-200 bg-white p-5">
            発生日時や利用した環境
          </li>
        </ul>
        <p class="mt-5 text-sm leading-7 text-neutral-600">
          パスワード、認証コード、お支払い情報は送らないでください。
        </p>
      </section>

      <section class="site-reveal mt-16">
        <SiteSectionHeader
          eyebrow="FAQ"
          title="よくある質問"
        />
        <UAccordion
          class="mt-6"
          :items="faqItems"
        />
      </section>
    </UContainer>
  </article>
</template>
