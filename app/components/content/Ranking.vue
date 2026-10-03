<script setup lang="ts">
defineProps<{ content: Record<string, string> }>();
</script>

<template>
  <UContainer
    as="section"
    data-page-container
  >
    <div class="site-reveal rounded-lg border border-neutral-200 bg-white p-6 md:p-10">
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="whitespace-pre-line text-xs font-black uppercase tracking-widest text-primary-600">
            {{ content.eyebrow }}
          </p>
          <h2 class="whitespace-pre-line mt-3 text-3xl font-black text-neutral-950">
            {{ content.title }}
          </h2>
        </div>
        <p class="max-w-2xl whitespace-pre-line leading-7 text-neutral-700">
          {{ content.description }}
        </p>
      </div>
      <div class="mt-8 overflow-x-auto rounded-lg border border-neutral-200">
        <table class="w-full text-left text-sm">
          <caption class="bg-neutral-50 px-4 py-3 text-left font-bold text-neutral-600">
            表示例の枠です。実際のプレイヤー・スコアではありません。
          </caption>
          <thead class="bg-neutral-50 text-xs font-black uppercase tracking-widest text-neutral-600">
            <tr>
              <th
                scope="col"
                class="px-4 py-3"
              >
                {{ content.rankLabel }}
              </th>
              <th
                scope="col"
                class="px-4 py-3"
              >
                {{ content.playerLabel }}
              </th>
              <th
                scope="col"
                class="px-4 py-3"
              >
                {{ content.scoreLabel }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-200">
            <tr
              v-for="rank in 10"
              :key="rank"
            >
              <th
                scope="row"
                class="px-4 py-3 font-black text-primary-700"
              >
                {{ rank }}
              </th>
              <td class="whitespace-pre-line px-4 py-3 text-neutral-600">
                {{ content.placeholder }}
              </td>
              <td class="px-4 py-3 text-neutral-500">
                —
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </UContainer>
</template>
