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

## ディレクトリ構成

開発者が直接触る主なファイルとディレクトリは以下の通りです。

- `pixelsia-website/`
  - `.github/` - GitHub の設定
  - `.vscode/` - VSCode の設定
  - `README.md` - このファイル
  - `.env.template` - 環境変数設定のテンプレート
  - `package.json` - Node.js の依存関係とスクリプト
  - `nuxt.config.ts` - Nuxt の設定
  - `content.config.ts` - Nuxt Content の設定
  - `public/` - バンドルせずにそのまま配信する静的ファイル
    - `favicon.ico` - サイトのファビコン
    - `robots.txt` - 検索エンジン向けの指示ファイル
    - `files/` - ダウンロード可能なファイル群
  - `app/` - Nuxt のビルド対象ディレクトリ
    - `app.config.ts` - 全体で共有する定数など
    - `assets/` - CSS、フォント、画像などのアセット (ファイルタイプでは分類しない)
      - `main.css` - 全体で使用する CSS
    - `utils/` - TypeScript ユーティリティ
    - `composables/` - 再利用可能な Vue コンポーザブル (共通ロジック)
    - `components/` - 再利用可能な Vue コンポーネント
    - `layouts/` - ページレイアウトの Vue コンポーネント
      - `default.vue` - デフォルトのレイアウト
    - `middleware/` - ページ遷移時のミドルウェア
    - `pages/` - 各ページの Vue コンポーネント
    - `app.vue` - アプリケーションのメインエントリーポイント
  - `vitest.config.ts` - Vitest の設定
  - `e2e-tests/` - 統合テスト
  - `eslint.config.mjs` - ESLint の設定
  - `.textlintrc.json` - textlint の設定

## 開発

Node.js v20 以降と pnpm がインストールされている必要があります。

開発環境は VS Code を推奨します。VS Code 以外を使用する場合は、`.vscode/` ディレクトリ内の設定を参考に設定してください。

一部の機能を利用するためには環境変数が必要です。`.env.template` に必要な変数が記載されています。環境変数をファイルから読み込みたい場合は、`.env.template` をコピーして `.env` ファイルを作成し、必要な値を設定してください。

### Git / GitHub

- [**GitHub Flow**](https://docs.github.com/ja/get-started/using-github/github-flow) を採用しています。
- Branch を生やしたら、Draft Pull Request を作成してから開発を始めてください。
  - Ready for review へ変更する前に、必ず `main` ブランチをマージして最新の状態にしてください。
- Pull Request の説明には、対応する Issue と変更内容を簡潔に記載してください。
  - `close #00` のように記載すると、マージ時に自動で Issue がクローズされます。
  - 理由や背景は Pull Request の説明ではなく、コード内にコメントとして記載してください。

### Commands

- `pnpm install`
  - 依存関係をインストールします。
  - リポジトリをクローンした後や、チェックアウトした後に実行してください。
  - 自動で `nuxt prepare` が実行され、`.nuxt/` ディレクトリが生成されます。
- `pnpm audit`
  - 依存関係の既知のセキュリティ問題をチェックします。
  - 問題が見つかった場合は、`pnpm update` を実行して依存関係を更新してください。
  - `pnpm update` で解決しない場合は、`pnpm audit --fix` を試してください。
- `pnpm dev`
  - 開発サーバーを起動します。
  - <http://localhost:3000> でアプリケーションにアクセスできます。
  - コードを変更すると自動的にリロードされます。
- `pnpm generate` (`pnpm build`)
  - プロダクションビルドを作成します。
  - そのまま配信できる静的ファイルが `.output/public/` に生成されます。
- `pnpm preview` (`pnpm dlx serve .output/public`)
  - プロダクションビルドをローカルでプレビューします。
  - <http://localhost:3000> でアプリケーションにアクセスできます。
- `pnpm analyze`
  - 一時的に SSR としてビルドしてから、ビルドのバンドルサイズを分析します。
  - <http://localhost:3000/client> でバンドル分析レポートにアクセスできます。
  - SSG を採用しているため、「Nitro server bundle stats」は無視してください。
- `pnpm test`
  - すべてのテストを実行します。
- `pnpm test:unit` / `pnpm test:e2e`
  - ユニットテスト / 統合テストを実行します。
- `pnpm test:coverage`
  - テストカバレッジを測定します。
  - `coverage/` ディレクトリに HTML レポートが生成されます。
- `pnpm test:ui`
  - Vitest の UI モードでテストを実行します。
  - ブラウザで <http://localhost:51204> にアクセスしてテスト結果を確認できます。
- `pnpm lint`
  - すべての Lint チェックを並列に実行します。
- `pnpm lint:fix`
  - すべての Lint の自動修正可能な問題を修正します。
- `pnpm lint:check:eslint` / `pnpm lint:fix:eslint`
  - ESLint のチェック / 自動修正をします。
- `pnpm lint:check:textlint` / `pnpm lint:fix:textlint`
  - textlint のチェック / 自動修正をします。

### Coding

- コードスタイルは、`.js` / `.ts` / `.vue` ファイルは ESLint Stylistic に、それ以外は Prettier に従ってください。
  - VS Code ならフォーマッターとして自動で適用されているはずです。
- リーダブルコードを心がけてください。
  - 変数などは簡潔で誤解されにくい命名を心がけてください。命名がうまくいかない場合は設計を見直してください。
  - 無駄なコメントは避け、そのコードを読む人にとって本当に必要な情報だけをコメントしてください。
  - できるだけ単一責任の原則に従い、1 つのモジュールやコンポーネントが多くの責任を持たないようにしてください。そして、クリーンアーキテクチャの考え方を参考に、関心事の分離を意識してください。
- Nuxt 4 と Vue.js 3 の最新のベストプラクティスに従ってください。
  - Composition API を優先的に使用し、Options API は避けてください。
  - インストールされている Nuxt Modules を優先的に使用し、独自実装は避けてください。
  - 簡単なことをするためだけにライブラリを追加しないでください。
    - まずは標準機能や既存の依存関係で実現できないか検討してください。
    - どうしても必要な場合は、軽量でメンテナンスされているライブラリを選んでください。

### Test

- ユニットテストはコロケーション (テスト対象と同じディレクトリに配置) してください。
- 統合テストは `e2e-tests/` ディレクトリに配置してください。

### Lint

- もしコメントで ESLint や textlint のルールを無効化する場合は、理由を明記してください。
