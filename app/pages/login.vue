<script setup lang="ts">
useSiteReveal();

useSeoMeta({
  title: 'ログイン',
  description: 'Clasteria のログイン機能は初期公開では Coming soon として表示します。',
});
</script>

<template>
  <article>
    <SitePageHero
      eyebrow="LOGIN"
      title="ログイン機能は Coming soon"
      description="README では、ログインは今後実装で、初期公開では飛べるけど Coming soon とする指定があります。ID server、Google ログイン、Minecraft OTP 連携の画面分担は未決です。"
      image="/images/clasteria/home-main-visual.png"
      image-alt="ログイン Coming soon のイメージ"
    >
      <template #actions>
        <UButton
          to="/"
          color="primary"
          size="xl"
        >
          Home へ戻る
        </UButton>
        <UButton
          to="/support"
          color="neutral"
          variant="outline"
          size="xl"
        >
          サポート
        </UButton>
      </template>
    </SitePageHero>

    <UContainer
      as="section"
      class="py-20"
    >
      <div class="site-reveal mx-auto max-w-3xl rounded-lg border border-neutral-200 bg-white p-6 md:p-10">
        <p class="text-xs font-black uppercase tracking-widest text-primary-600">
          LOGIN FORM
        </p>
        <h2 class="mt-3 text-3xl font-black text-neutral-950">
          ログインフォーム
        </h2>
        <p class="mt-4 leading-8 text-neutral-700">
          ワイヤーフレームにあるメールアドレス、パスワード、開始ボタンの枠です。ID server 連携が未決のため入力は無効化しています。
        </p>
        <div class="mt-8 grid gap-4">
          <UInput
            placeholder="メールアドレス"
            disabled
          />
          <UInput
            placeholder="パスワード"
            type="password"
            disabled
          />
          <UButton
            color="primary"
            disabled
            block
          >
            Coming soon
          </UButton>
        </div>
      </div>

      <SiteTodoNotice
        class="site-reveal mt-10"
        title="ログイン関連の未決事項"
        :items="[unresolvedItems[2]]"
      />
    </UContainer>
  </article>
</template>
