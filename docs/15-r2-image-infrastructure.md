# 15. Cloudflare R2 画像基盤（アップロード・リサイズ・削除）

**依存**: なし（14 と並行可）
**参照**: REQUIREMENTS_phase2.md §11・§9
**マイルストーン**: M1

## 目的

記録カードの写真を Cloudflare R2（無料枠）に保存・配信する基盤を作る。リサイズ+WebP 圧縮はサーバー側で行い、AI 下書き生成（22）の送信用縮小と共用できる形にする。

## 運用者タスク（まさゆきさん）

- [ ] Cloudflare アカウントで R2 バケットを作成する（例: `labocore-kiroku`）
- [ ] r2.dev の公開アクセスを有効化し、公開 URL を控える
- [ ] R2 API トークン（オブジェクト読み書き権限）を発行する
- [ ] `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` / `R2_PUBLIC_BASE_URL` を `.env.local` と Vercel（Production）に設定する

## Todo

- [ ] `@aws-sdk/client-s3` を導入し、R2 用モジュール `src/lib/r2.ts`（server-only）を作成する: `uploadImage` / `deleteImage` / `copyImage`（23 の複製用）
- [ ] `sharp` を導入し、リサイズ+WebP 変換 `src/lib/image.ts` を作成する: 長辺 px と品質を引数化（掲載用=長辺1200px。AI 送信用の縮小と共用できる設計）
- [ ] `next.config.ts` の `serverActions.bodySizeLimit` を引き上げる（スマホ写真2枚を想定し 10mb 目安。Server Action のボディ既定は 1MB で不足する）
- [ ] 写真表示に `next/image` を使う場合は `images.remotePatterns` に R2 公開ドメインを追加する（使わない場合は `<img>` + 遅延読み込みで可。20 と方針を合わせる）
- [ ] オブジェクトキーは推測困難な形式にする（例: `{uuid}.webp`）。DB には**完全な公開 URL**（`R2_PUBLIC_BASE_URL` + キー）で保存する（将来の配信先変更を容易にする・要件 §11）
- [ ] 削除はベストエフォートとする: R2 側の削除失敗で DB 操作を失敗させない（コンソールにログを残す。孤児オブジェクトは無料枠 10GB 内で許容）

## 完了条件

- ローカルで「画像アップロード → WebP 変換確認 → 公開 URL で表示 → 削除」の一連が動作する
- 数 MB のスマホ写真がアップロードでき、変換後は数百 KB 程度に収まる
