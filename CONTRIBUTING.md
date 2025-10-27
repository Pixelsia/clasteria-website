# Pixelsia Website 開発者向けガイド

このプロジェクトの概要については、[README.md](./README.md) を参照してください。

ディレクトリ構成は [**Nuxt Guide v4**](https://nuxt.com/docs/4.x/guide/directory-structure) を基づいています。

## 開発

Node.js v20 以降と pnpm がインストールされている必要があります。

開発環境は VS Code を推奨します。VS Code 以外を使用する場合は、`.vscode/` ディレクトリ内の設定を参考に設定してください。

`pnpm install` を実行して依存関係をインストールしてください。自動で `nuxt prepare` が実行され、`.nuxt/` ディレクトリが生成されます。環境変数が必要な場合は `.env.template` をコピーして `.env` ファイルを作成し、必要な値を設定してください。`pnpm dev` コマンドで開発サーバーが起動します。その他のスクリプトは `package.json` の `scripts` を参照してください。

### Git / GitHub

- [**GitHub Flow**](https://docs.github.com/ja/get-started/using-github/github-flow) を採用しています。
- Branch を生やしたら、Draft Pull Request を作成してから開発を始めてください。
  - Ready for review へ変更する前に、必ず `main` ブランチをマージして最新の状態にしてください。
- Pull Request の説明には、対応する Issue と変更内容を簡潔に記載してください。
  - `close #00` のように記載すると、マージ時に自動で Issue がクローズされます。
  - 理由や背景は Pull Request の説明だけでなく、コード内にもコメントとして記載してください。

### Package Manager

- 必ず pnpm を使用し、npm や Yarn や Bun は使用しないでください。
- `pnpm add` で依存関係を追加してください。
  - 通常 `dependencies` と `devDependencies` の使い分けは本番環境での使用有無に基づきますが、バンドラーを使用しているためビルド時の使用有無に基づいて使い分けてください。
  - **ビルド時に必要な依存関係は `dependencies` に追加してください。**
  - **ビルド時に不要な依存関係のみ `devDependencies` に追加してください。**

### Coding

- できるだけ JavaScript よりも TypeScript を使用してください。
- コードスタイルは、`.mjs` / `.ts` / `.vue` ファイルは ESLint Stylistic に、それ以外は Prettier に従ってください。
  - VS Code ならフォーマッターとして自動で適用されているはずです。
- リーダブルコードを心がけてください。具体的には以下を意識してください。
  - 変数やファイル名などは簡潔で誤解されにくい命名を心がけてください。意味の弱い単語を含む冗長な名前にならないように気を付けてください。命名がうまくいかない場合は設計を見直してください。
  - 無駄なコメントは避け、そのコードを読む人にとって本当に必要な情報だけをコメントしてください。
  - できるだけ単一責任の原則に従い、1 つのモジュールやコンポーネントが多くの責任を持たないようにしてください。
  - クリーンアーキテクチャに基づき、より抽象的なレイヤーがより具体的なレイヤーに依存しないでください。([**おすすめ資料**](https://www.docswell.com/s/nuits_jp/5DNXE9-easiest-clean-architecture))
    - `utils/` ディレクトリには純粋なロジックのみを配置し、Vue.js に依存するロジックは `composables/` に配置してください。
- Nuxt 4 と Vue.js 3 の最新のベストプラクティスに従ってください。
  - Composition API を優先的に使用し、Options API は避けてください。
  - インストールされている Nuxt Modules を優先的に使用し、独自実装は避けてください。
    - 例えば、CSS はできるだけ書かずに、Nuxt UI や Tailwind CSS を優先的に使用してください。
    - 例えば、画像は常に Nuxt Image の `<NuxtPicture>` コンポーネントを使用してください。(SVG は `<NuxtImg>` コンポーネントを使用してください)
  - 簡単なことをするためだけにライブラリを追加しないでください。
    - まずは標準機能や既存の依存関係で実現できないか検討してください。
    - どうしても必要な場合は、軽量でメンテナンスされているライブラリを選んでください。

### Test

- ユニットテストはコロケーション (テスト対象と同じディレクトリに配置) してください。
- E2E テストは `e2e-tests/` ディレクトリに配置してください。

### Lint

- もしコメントで ESLint や textlint のルールを無効化する場合は、理由を明記してください。

## パフォーマンスチューニング

パフォーマンスチューニングを行う際は、「推測するな、計測せよ」という原則に従い、根拠に基づいて最適化してください。計測には以下の方法をお勧めします。

- Lighthouse レポート
- ブラウザーの開発者ツールの Performance および Network タブ
- `pnpm analyze` コマンドで生成できるバンドル分析レポート
  - SSG を採用しているため、「Nitro server bundle stats」は無視してください。

> [!Note]
> ビルドで生成された HTML ファイルを調べると、`<style id="nuxt-ui-colors"></style>` 内の CSS が最適化されていないことに気づくかもしれません。
> これは、Nuxt UI がビルド時に文字列として挿入するため、Vite の Minification や Tree shaking の対象外となるためです。
> 簡単な回避策がなく、Brotli 圧縮で十分に軽減できるため、この問題は無視してください。
