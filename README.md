# Pixelsia Website

**&copy; 2025 Pixelsia**  
License: [**MIT License**](./LICENSE)

Pixelsia 公式ウェブサイトのソースコード

本番環境: **<https://pixelsia.net/>**

SSG (静的サイト生成) を採用し、Cloudflare Pages で配信しています。

<!--
記事は [**Pixelsia/pixelsia-articles (private)**](https://github.com/Pixelsia/pixelsia-articles) で管理しています。GitHub Actions により、記事の更新時にも Cloudflare Pages を再デプロイしています。
-->

## 使用技術

- Framework: **Nuxt 4** (Vue.js 3)
- Language: **TypeScript**
- Styling: **Tailwind CSS**, **Nuxt UI**
- Package Manager: **pnpm**
- Testing: **Vitest**, **Playwright**
- Linting: **ESLint**, **textlint**

## ビルド手順

以下の手順で本番環境向けの静的ファイルをビルドできます。開発環境の構築は [CONTRIBUTING.md](./CONTRIBUTING.md) を参照してください。

Node.js v20 以降と pnpm がインストールされている必要があります。デプロイ環境は Cloudflare Pages を想定しているため、Dockerfile は用意していません。

### 1. 環境変数の設定

一部の機能を利用するためには環境変数が必要です。`.env.template` に必要な変数が記載されています。  
環境変数をファイルから読み込みたい場合は、`.env.template` をコピーして `.env` ファイルを作成し、必要な値を設定してください。  
また、`NODE_ENV` は必ず `production` に設定してください。

### 2. 依存関係のインストール

```bash
pnpm install --frozen-lockfile --prod
```

自動で `nuxt prepare` が実行され、`.nuxt/` ディレクトリが生成されます。

### 3. ビルドの実行

```bash
pnpm generate
```

そのまま配信できる静的ファイルが `.output/public/` に生成されます。

> [!Tip]
> `pnpm preview` または `pnpm dlx serve .output/public` でローカルプレビューできます。

## 開発者向けガイド

開発者向けガイドは [CONTRIBUTING.md](./CONTRIBUTING.md) を参照してください。
