<template>
  <div>
    <!-- ページヘッダー -->
    <section class="text-center pt-12 pb-12">
      <h1 class="text-4xl font-bold text-primary-700">
        CodingCraft
      </h1>
      <p class="text-primary-500 mt-4 leading-relaxed">
        基礎から実践まで。自分のペースで学習を進めましょう。<br>
        ステージを選択して、課題をクリアしていってください。
      </p>
    </section>

    <!-- ガイド・ナビゲーション -->
    <section class="px-6 pb-12">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <!-- カードA: 使い方 -->
        <div class="bg-white border-2 border-primary-100 rounded-2xl p-6 flex flex-col justify-between min-h-[270px]">
          <div>
            <div class="bg-primary-100 text-primary-500 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
              <UIcon
                name="i-heroicons-book-open"
                class="w-6 h-6"
              />
            </div>
            <h2 class="text-xl font-normal text-primary-700 mb-2">
              使い方
            </h2>
            <p class="text-primary-500/80">
              エディタの操作方法や基本的な構文について解説します。
            </p>
          </div>
          <UButton
            variant="outline"
            color="primary"
            block
          >
            ガイドを見る
          </UButton>
        </div>

        <!-- カードB: マップ紹介 -->
        <div class="bg-white border-2 border-primary-100 rounded-2xl p-6 flex flex-col justify-between min-h-[270px]">
          <div>
            <div class="bg-primary-100 text-primary-500 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
              <UIcon
                name="i-heroicons-map"
                class="w-6 h-6"
              />
            </div>
            <h2 class="text-xl font-normal text-primary-700 mb-2">
              マップ紹介
            </h2>
            <p class="text-primary-500/80">
              学習に使用する様々なフィールドの特徴を確認できます。
            </p>
          </div>
          <UButton
            variant="outline"
            color="primary"
            block
          >
            マップ一覧
          </UButton>
        </div>

        <!-- カードC: Web側ログイン -->
        <div class="bg-secondary-50 border-2 border-secondary-200 rounded-2xl p-6 flex flex-col justify-between min-h-[270px]">
          <div>
            <div class="bg-secondary-100 text-secondary-600 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
              <UIcon
                name="i-heroicons-command-line"
                class="w-6 h-6"
              />
            </div>
            <h2 class="text-xl font-normal text-primary-700 mb-2">
              Web側ログイン
            </h2>
            <p class="text-primary-500/80">
              学習の進捗保存やステージへのアクセスにはログインが必要です。
            </p>
          </div>
          <UButton
            color="secondary"
            variant="solid"
            block
          >
            ログインへ
          </UButton>
        </div>
      </div>
    </section>
  </div>
</template>
