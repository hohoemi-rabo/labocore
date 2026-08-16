# 15. Cloudflare R2 画像基盤（アップロード・リサイズ・削除）

**依存**: なし（14 と並行可）
**参照**: REQUIREMENTS_phase2.md §11・§9
**マイルストーン**: M1

## 目的

記録カードの写真を Cloudflare R2（無料枠）に保存・配信する基盤を作る。リサイズ+WebP 圧縮はサーバー側で行い、AI 下書き生成（22）の送信用縮小と共用できる形にする。

## 運用者タスク（まさゆきさん）

**手順は README の「[写真の保存先（Cloudflare R2）](../README.md#写真の保存先cloudflare-r2)」に記載済み。**
設定後に `npm run verify:r2` が通れば完了。

- [ ] Cloudflare アカウントで R2 バケットを作成する（例: `labocore-kiroku`）
- [ ] r2.dev の公開アクセスを有効化し、公開 URL を控える
- [ ] R2 API トークン（オブジェクト読み書き権限）を発行する
- [ ] `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` / `R2_PUBLIC_BASE_URL` を `.env.local` と Vercel（Production）に設定する
- [ ] `npm run verify:r2` で疎通確認する

## Todo

- [x] `@aws-sdk/client-s3` を導入し、R2 用モジュール `src/lib/r2.ts`（server-only）を作成する: `uploadImage` / `deleteImage` / `copyImage`（23 の複製用）
- [x] `sharp` を導入し、リサイズ+WebP 変換 `src/lib/image.ts` を作成する: 長辺 px と品質を引数化（掲載用=長辺1200px。AI 送信用の縮小と共用できる設計）
- [x] `next.config.ts` の `serverActions.bodySizeLimit` を引き上げる（スマホ写真2枚を想定し 10mb 目安。Server Action のボディ既定は 1MB で不足する）
- [x] 写真表示に `next/image` を使う場合は `images.remotePatterns` に R2 公開ドメインを追加する（使わない場合は `<img>` + 遅延読み込みで可。20 と方針を合わせる）
  - **素の `<img loading="lazy">` を採用**。アップロード時点で長辺1200px+WebP に変換済みなので next/image の再最適化は実益がなく、Vercel の画像変換無料枠を消費しない。R2 の公開ドメインを設定に固定しないので将来の配信先変更も楽。**チケット20 もこの方針**
- [x] オブジェクトキーは推測困難な形式にする（例: `{uuid}.webp`）。DB には**完全な公開 URL**（`R2_PUBLIC_BASE_URL` + キー）で保存する（将来の配信先変更を容易にする・要件 §11）
- [x] 削除はベストエフォートとする: R2 側の削除失敗で DB 操作を失敗させない（コンソールにログを残す。孤児オブジェクトは無料枠 10GB 内で許容）

### 実装中に確定した事項

- [x] **`sharp` は `^0.35.3`**。`^0.34.x`（Next の optional dependency と同じ範囲）だと1コピーで済むが、**0.35.0 未満には libvips 由来の high severity 脆弱性**（CVE-2026-33327 / 33328 / 35590 / 35591）がある。利用者がアップロードした画像を通す経路なので採らない。`package.json` の `overrides` で Next 側も 0.35.3 に寄せ、コピーは1つに保つ（`next/image` は未使用なので影響なし）
- [x] **AWS SDK v3 のチェックサム既定値を上書き**する。3.1111.0 の既定は `WHEN_SUPPORTED`（= `x-amz-checksum-*` を送る）で、S3 互換ストアで弾かれることがある。SigV4 が署名済みペイロードハッシュで完全性を担保しているため、`requestChecksumCalculation` / `responseChecksumValidation` とも `WHEN_REQUIRED` にする
- [x] `processImage` は **`.rotate()` を resize より前に呼ぶ**（EXIF Orientation を実ピクセルへ焼き込む。省くとスマホ写真が横倒しになる）。sharp は既定でメタデータを引き継がないため **EXIF/GPS は変換時に落ちる**（要件 §11 の「個人情報を写さない」運用を技術面からも支える）
- [x] 疎通確認は `scripts/verify-r2.ts`（`npm run verify:r2`）。一時ページではなく**常設のツール**にした（トークン更新時・障害切り分けにも使える）。`server-only` を import したモジュールを Node から実行するため `--conditions=react-server` を付ける（この条件で `server-only` が no-op に解決される）
- [x] `tsconfig.json` に `allowImportingTsExtensions: true` を追加（スクリプトが `../src/lib/*.ts` を拡張子付きで import するため。`noEmit` 前提のオプション）
- [x] README の keepalive の補足（「RLS が authenticated 限定のため件数 0」）がチケット14 以降は誤りだったので修正

### 後続チケットへの申し送り

- **16**: Server Action で `processImage(buffer)` → `uploadImage(processed)` の順に呼び、返った公開 URL を `image_urls` に入れる。削除時は `deleteImage(url)`（失敗しても DB 操作は続行してよい設計）。写真は `<img loading="lazy">` で表示し、`width`/`height` を入れて CLS を防ぐ
- **22**: Gemini へ送る画像は `processImage(buffer, { maxEdge: AI_MAX_EDGE })`（長辺768px・実測 約100KB）
- **23**: `copyImage(url)` で R2 オブジェクトごと複製する（URL 共有にしない）

## 完了条件

- ローカルで「画像アップロード → WebP 変換確認 → 公開 URL で表示 → 削除」の一連が動作する
  → `npm run verify:r2`（**R2 設定後に実行**）
- 数 MB のスマホ写真がアップロードでき、変換後は数百 KB 程度に収まる
  → 実測: 5.46 MB (3000×2000 JPEG) → **338 KB** (1200×800 WebP)
