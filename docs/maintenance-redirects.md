# 未公開ページの転送

初期公開は Home、ニュース、お問い合わせを対象にしています。鬼ごっこ、かくれんぼ、CodingCraft、ランキング、ログイン、購入・登録の試作ソースは残し、Nuxt のページ登録から除外しています。

## 転送先の設定

`NUXT_PUBLIC_MAINTENANCE_URL` をビルド環境に設定します。既定値は、2026-10-02 にメンテナンス表示を確認した `https://pixelsia.net/` です。専用のメンテナンス用パスは確認していません。

```dotenv
NUXT_SITE_URL="https://clasteria.pixelsia.net"
NUXT_PUBLIC_MAINTENANCE_URL="https://pixelsia.net/"
```

SSG のため、値を変更したら再ビルドが必要です。環境変数は秘密情報を含めず、HTTPS の絶対 URL を指定してください。クエリ、フラグメント、認証情報を含む URL、公開サイトと同じオリジン、未公開ルートを転送先にするとビルドが失敗します。同じホストに誤って配信した場合も、Cloudflare の転送処理は 503 で停止し、ループを作りません。

Pixelsia のトップページは将来変更される可能性があります。公開のたびに転送先が実際にメンテナンス案内であることと、Clasteria 側に戻るリダイレクトがないことを確認してください。転送先の変更が必要なら、公開担当者が確認した URL に設定を更新します。

## 対象と配信方法

次の 6 パスと、それぞれ末尾に `/` を付けたパスだけが対象です。

- `/onigokko`
- `/kakurenbo`
- `/codingcraft`
- `/leaderboard`
- `/login`
- `/register`

Home と未知のパスをまとめて転送するワイルドカードは使用していません。未知のパスは既存のカスタム 404 になります。

- Nuxt の開発サーバーとクライアント内の移動には、共通リストを使うグローバルミドルウェアを適用します。
- `pnpm generate` は `.output/public` に Cloudflare Pages の `_worker.js` と `_routes.json` を生成します。Function の呼び出し対象は上記 12 パスだけです。HTTP 302 と固定の `Location` を返し、アクセス元 URL のクエリは転送しません。公開ページや静的アセットは通常の静的配信のままです。
- `_redirects` と Nitro のリダイレクトルールはクエリを引き継ぐため使っていません。認証関連の URL に含まれた情報を別オリジンへ渡さないためです。
- 一般的な静的プレビュー用に、転送だけを行う小さな HTML も生成します。試作の本文や Nuxt のページバンドルは含めません。`pnpm preview` は Function を実行しないため、ここでは HTML による移動になります。HTTP 302 の検証は Cloudflare Pages のプレビュー配信で行います。
- Pages Functions の無料枠を使い切った場合の配信動作は、プロジェクトの既存設定に従います。設定が fail open なら静的 HTML による転送、fail closed ならサービス側のエラー表示になります。この変更でアカウント設定は変えていません。

Cloudflare Pages へは、Function を含む `.output/public` 全体を配信してください。別の静的ホストを使う場合は、そのホストで対象パスだけに固定 URL の HTTP 302 を設定してください。既存の `_worker.js` や `/functions` を追加する場合は、生成処理と統合してください。

## 公開前の確認

1. 転送先の画面と最終 URL を目視し、メンテナンス案内が公開されていることを確認します。
2. `NUXT_SITE_URL` が本番の公開先と一致することを確認してから `pnpm generate` を実行します。
3. `.output/public/_routes.json` の対象が上記 12 パスだけであることを確認します。
4. Cloudflare Pages のプレビューで、各パスと末尾 `/` 付きパスが HTTP 302 になり、`Location` が設定した転送先と完全一致することを確認します。`?maintenance_test=private` 付きの URL でも値を引き継がないことを確認します。
5. Home、ニュース、お問い合わせ、記事の公開 URL を確認します。`/missing` と `/login/extra` はカスタム 404 のままであることを確認します。
6. ブラウザーの戻る・進むと Nuxt のクライアント内の移動を確認します。

```sh
BASE_URL=https://YOUR_PREVIEW_DOMAIN \
NUXT_PUBLIC_MAINTENANCE_URL=https://pixelsia.net/ \
REQUIRE_HTTP_REDIRECTS=1 \
CHROMIUM_PATH=/usr/bin/chromium \
pnpm exec node e2e-tests/smoke.mjs
```

スモークテストは転送先の画面だけをスタブ化して、移動先 URL を検証します。実際のメンテナンス画面の確認は手順 1 で別途行ってください。

## 参考資料

- [Nuxt の外部 URL への移動](https://nuxt.com/docs/4.x/api/utils/navigate-to)
- [Cloudflare Pages の Advanced mode](https://developers.cloudflare.com/pages/functions/advanced-mode/)
- [Cloudflare Pages の Function 呼び出し対象](https://developers.cloudflare.com/pages/functions/routing/)
- [Cloudflare のリダイレクト実装](https://github.com/cloudflare/workers-sdk/blob/main/packages/workers-shared/asset-worker/src/handler.ts)
