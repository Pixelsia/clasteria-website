<script setup lang="ts">
import { supportDiscord, supportEmail } from '~/utils/siteContent';

defineProps<{ content: Record<string, string> }>();

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
</script>

<template>
  <UContainer
    as="section"
    data-page-container
  >
    <div class="grid gap-6 md:grid-cols-2">
      <section class="site-reveal flex flex-col rounded-lg border border-neutral-200 bg-white p-6 md:p-10">
        <UIcon
          name="i-heroicons-envelope"
          class="size-8 text-primary-600"
        />
        <h2 class="whitespace-pre-line mt-5 text-2xl font-black text-neutral-950">
          {{ content.emailTitle }}
        </h2>
        <p class="mt-4 whitespace-pre-line leading-8 text-neutral-700">
          {{ content.emailDescription }}
        </p>
        <a
          :href="`mailto:${supportEmail}`"
          class="mt-5 break-all text-lg font-bold text-primary-700 underline underline-offset-4"
        >
          {{ content.emailLabel }}
        </a>
        <div class="mt-6 flex flex-wrap gap-3">
          <UButton
            :to="`mailto:${supportEmail}`"
            size="lg"
            icon="i-heroicons-envelope"
          >
            {{ content.emailButtonLabel }}
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            size="lg"
            icon="i-heroicons-clipboard"
            @click="copyEmail"
          >
            {{ emailCopied ? content.copiedLabel : content.copyLabel }}
          </UButton>
        </div>
        <p
          role="status"
          class="mt-3 whitespace-pre-line text-sm text-neutral-600"
        >
          <template v-if="copyFailed">
            コピーできませんでした。上のアドレスを選択してコピーしてください。
          </template>
          <template v-else-if="emailCopied">
            メールアドレスをコピーしました。
          </template>
          <template v-else>
            {{ content.emailNote }}
          </template>
        </p>
      </section>
      <section class="site-reveal flex flex-col rounded-lg border border-neutral-200 bg-neutral-50 p-6 md:p-10">
        <UIcon
          name="i-heroicons-chat-bubble-left-right"
          class="size-8 text-primary-600"
        />
        <h2 class="whitespace-pre-line mt-5 text-2xl font-black text-neutral-950">
          {{ content.discordTitle }}
        </h2>
        <p class="mt-4 whitespace-pre-line leading-8 text-neutral-700">
          {{ content.discordDescription }}
        </p>
        <div class="mt-6">
          <UButton
            :to="supportDiscord"
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            trailing-icon="i-heroicons-arrow-up-right"
          >
            {{ content.discordLabel }}
          </UButton>
        </div>
        <p class="whitespace-pre-line mt-3 text-sm leading-7 text-neutral-600">
          {{ content.discordNote }}
        </p>
      </section>
    </div>
  </UContainer>
</template>
