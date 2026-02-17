# Clasteria Website

**&copy; 2025 Pixelsia**  
License: [**MIT License**](./LICENSE)

Clasteria 公式ウェブサイトのソースコード

<!--
記事管理: [**Pixelsia/clasteria-website-content (private)**](https://github.com/Pixelsia/clasteria-website-content)
本番環境: **<https://clasteria.pixelsia.net/>**
-->

SSG (静的サイト生成) を採用し、Cloudflare Pages で配信しています。

## 使用技術

- Framework: **Nuxt 4** (Vue.js 3)
- Language: **TypeScript**
- Package Manager: **pnpm**
- Testing: **Vitest**, **Playwright**
- Linting: **ESLint**, **textlint**
- Styling: **Tailwind CSS v4**, **Nuxt UI v4**
- Content Manager: **Nuxt Content v3**

## 記事の管理方法

TODO: 記事の管理方法についての説明を追加する

## ビルド手順

以下の手順で本番環境向けの静的ファイルをビルドできます。開発環境の構築は [CONTRIBUTING.md](./CONTRIBUTING.md) を参照してください。

Node.js v20 以降と pnpm がインストールされている必要があります。デプロイ環境は Cloudflare Pages を想定しているため、Dockerfile は用意していません。

### 1. 環境変数の設定

一部の機能を利用するためには環境変数が必要です。`.env.example` に必要な変数が記載されています。  
環境変数をファイルから読み込みたい場合は、`.env.example` をコピーして `.env` ファイルを作成し、必要な値を設定してください。  

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
