<script setup lang="ts">
useSiteReveal();

useSeoMeta({
  title: 'リーダーボード',
  description: 'Clasteria の各ゲーム Top10 の枠を表示します。実データ連携は未決です。',
});
</script>

<template>
  <article>
    <SitePageHero
      eyebrow="LEADERBOARD"
      title="各ゲームの Top10 枠"
      description="HP 仕様書では、リーダーボードは各ゲームのランキング Top10 を紹介するページです。データソース、集計期間、更新頻度は未決のため、初期実装では TODO として枠だけを表示します。"
      image="/images/clasteria/minigame.jpg"
      image-alt="リーダーボードのイメージ"
    >
      <template #actions>
        <UButton
          to="/onigokko"
          color="primary"
          size="xl"
        >
          鬼ごっこへ
        </UButton>
        <UButton
          to="/kakurenbo"
          color="neutral"
          variant="outline"
          size="xl"
        >
          かくれんぼへ
        </UButton>
      </template>
    </SitePageHero>

    <UContainer
      as="section"
      class="py-20"
    >
      <div class="grid gap-8">
        <section
          v-for="group in leaderboardGroups"
          :key="group.title"
          class="site-reveal rounded-lg border border-neutral-200 bg-white p-6 md:p-10"
        >
          <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p class="text-xs font-black uppercase tracking-widest text-primary-600">
                TOP 10
              </p>
              <h2 class="mt-3 text-3xl font-black text-neutral-950">
                {{ group.title }}
              </h2>
            </div>
            <p class="max-w-2xl leading-7 text-neutral-700">
              {{ group.description }}
            </p>
          </div>

          <div class="mt-8 overflow-hidden rounded-lg border border-neutral-200">
            <table class="w-full text-left text-sm">
              <thead class="bg-neutral-50 text-xs font-black uppercase tracking-widest text-neutral-600">
                <tr>
                  <th class="px-4 py-3">
                    Rank
                  </th>
                  <th class="px-4 py-3">
                    Player
                  </th>
                  <th class="px-4 py-3">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-200">
                <tr
                  v-for="row in group.rows"
                  :key="`${group.title}-${row.rank}`"
                >
                  <td class="px-4 py-3 font-black text-primary-700">
                    {{ row.rank }}
                  </td>
                  <td class="px-4 py-3 text-neutral-900">
                    {{ row.player }}
                  </td>
                  <td class="px-4 py-3 text-neutral-500">
                    {{ row.score }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <SiteTodoNotice
        class="site-reveal mt-10"
        title="リーダーボードの未決事項"
        :items="[unresolvedItems[0]]"
      />
    </UContainer>
  </article>
</template>
