# 15. Cloudflare R2 画像基盤（アップロード・リサイズ・削除）

**依存**: なし（14 と並行可）
**参照**: REQUIREMENTS_phase2.md §11・§9
**マイルストーン**: M1

## 目的

記録カードの写真を Cloudflare R2（無料枠）に保存・配信する基盤を作る。リサイズ+WebP 圧縮はサーバー側で行い、AI 下書き生成（22）の送信用縮小と共用できる形にする。

## 運用者タスク（まさゆきさん）

**手順は README の「[写真の保存先（Cloudflare R2）](../README.md#写真の保存先cloudflare-r2)」に記載済み。**
設定後に `npm run verify:r2` が通れば完了。

- [x] Cloudflare アカウントで R2 バケットを作成する（`labocore-kiroku`・アジア太平洋・Standard）
- [x] r2.dev の公開アクセスを有効化し、公開 URL を控える
- [x] R2 API トークン（**アカウント API トークン** / オブジェクト読み書き / バケット限定 / TTL 無期限 / IP 制限なし）を発行する
- [x] 5変数を `.env.local` に設定する
- [ ] **同じ5変数を Vercel（Production）に設定する** ← 本番デプロイ前に必要
- [x] `npm run verify:r2` で疎通確認する（2026-08-16・全8ステップ成功）

## Todo

- [x] `@aws-sdk/client-s3` を導入し、R2 用モジュール `src/lib/r2.ts`（server-only）を作成する: `uploadImage` / `deleteImage` / `copyImage`（23 の複製用）
- [x] `sharp` を導入し、リサイズ+WebP 変換 `src/lib/image.ts` を作成する: 長辺 px と品質を引数化（掲載用=長辺1200px。AI 送信用の縮小と共用できる設計）
- [x] `next.config.ts` の `serverActions.bodySizeLimit` を引き上げる（スマホ写真2枚を想定し 10mb 目安。Server Action のボディ既定は 1MB で不足する）
  - **10mb は不可**。**Vercel のリクエストボディ上限は 4.5MB**（プラットフォーム側で 413 `FUNCTION_PAYLOAD_TOO_LARGE`。関数に届く前に切られるので `bodySizeLimit` では超えられない）。`4mb` に設定し、**送信前にブラウザ側で縮小する**（`src/lib/image-client.ts`）二段構えにした
- [x] 写真表示に `next/image` を使う場合は `images.remotePatterns` に R2 公開ドメインを追加する（使わない場合は `<img>` + 遅延読み込みで可。20 と方針を合わせる）
  - **素の `<img loading="lazy">` を採用**。アップロード時点で長辺1200px+WebP に変換済みなので next/image の再最適化は実益がなく、Vercel の画像変換無料枠を消費しない。R2 の公開ドメインを設定に固定しないので将来の配信先変更も楽。**チケット20 もこの方針**
- [x] オブジェクトキーは推測困難な形式にする（例: `{uuid}.webp`）。DB には**完全な公開 URL**（`R2_PUBLIC_BASE_URL` + キー）で保存する（将来の配信先変更を容易にする・要件 §11）
- [x] 削除はベストエフォートとする: R2 側の削除失敗で DB 操作を失敗させない（コンソールにログを残す。孤児オブジェクトは無料枠 10GB 内で許容）

### 実装中に確定した事項

- [x] **Vercel のリクエストボディ上限 4.5MB への対応**（当初 10mb で実装したが到達不可能と判明し修正）。スマホ写真は1枚 3〜5MB あり2枚で確実に 413 になるため、**ブラウザ側の事前縮小 `src/lib/image-client.ts` を追加**した（長辺2000px・canvas 経由）。副次的に **HEIC 問題も解消**する（sharp は HEIC を読めないが、ブラウザは OS のデコーダで開けるため canvas を通せば扱える形式になる）。サーバー側（`image.ts`）が最終的に長辺1200px+WebP へ仕上げる二段構え
- [x] **`keyFromUrl` は公開 URL の前方一致で判定しない**。DB に完全な URL を保存しているのは将来 r2.dev から移行するためなのに（要件 §11）、前方一致だと移行した瞬間に既存行が全部マッチしなくなり削除も複製もできなくなる。**キーの形（UUID + `.webp`）だけで判定**し、ホストが変わっても動くようにした
- [x] **`sharp` は `^0.35.3`**。`^0.34.x`（Next の optional dependency と同じ範囲）だと1コピーで済むが、**0.35.0 未満には libvips 由来の high severity 脆弱性**（CVE-2026-33327 / 33328 / 35590 / 35591）がある。利用者がアップロードした画像を通す経路なので採らない。`package.json` の `overrides` で Next 側も 0.35.3 に寄せ、コピーは1つに保つ（`next/image` は未使用なので影響なし）
- [x] **AWS SDK v3 のチェックサム既定値を上書き**する。3.1111.0 の既定は `WHEN_SUPPORTED`（= `x-amz-checksum-*` を送る）で、S3 互換ストアで弾かれることがある。SigV4 が署名済みペイロードハッシュで完全性を担保しているため、`requestChecksumCalculation` / `responseChecksumValidation` とも `WHEN_REQUIRED` にする
- [x] `processImage` は **`.rotate()` を resize より前に呼ぶ**（EXIF Orientation を実ピクセルへ焼き込む。省くとスマホ写真が横倒しになる）。sharp は既定でメタデータを引き継がないため **EXIF/GPS は変換時に落ちる**（要件 §11 の「個人情報を写さない」運用を技術面からも支える）
- [x] 疎通確認は `scripts/verify-r2.mts`（`npm run verify:r2`）。拡張子が `.mts` なのは Node に ESM だと即座に伝えるため（`.ts` だと毎回 `MODULE_TYPELESS_PACKAGE_JSON` の警告が出て、確認ツールとして紛らわしい）。一時ページではなく**常設のツール**にした（トークン更新時・障害切り分けにも使える）。`server-only` を import したモジュールを Node から実行するため `--conditions=react-server` を付ける（この条件で `server-only` が no-op に解決される）
- [x] `tsconfig.json` に `allowImportingTsExtensions: true` を追加（スクリプトが `../src/lib/*.ts` を拡張子付きで import するため。`noEmit` 前提のオプション）
- [x] README の keepalive の補足（「RLS が authenticated 限定のため件数 0」）がチケット14 以降は誤りだったので修正

### 後続チケットへの申し送り

- **16**:
  - **送信前に必ず `shrinkImageInBrowser(file)` を通す**（`src/lib/image-client.ts`）。Vercel の 4.5MB 上限に収めるため必須。これを省くとローカルでは動いて本番だけ 413 になる
  - ファイル選択は `accept="image/jpeg,image/png,image/webp"` にする。**`image/heic` を含めてはいけない**（Safari 17+ は accept に heic があると変換せず HEIC のまま渡してくる。含めなければ JPEG に変換して渡す）
  - Server Action では `processImage(buffer)` → `uploadImage(processed)` の順に呼び、返った公開 URL を `image_urls` に入れる。削除時は `deleteImage(url)`（失敗しても DB 操作は続行してよい設計）
  - 写真は `<img loading="lazy">` で表示し、`width`/`height` を入れて CLS を防ぐ
- **22**: Gemini へ送る画像は `processImage(buffer, { maxEdge: AI_MAX_EDGE })`（長辺768px・実測 約100KB）
- **23**: `copyImage(url)` で R2 オブジェクトごと複製する（URL 共有にしない）

## 完了条件

- [x] ローカルで「画像アップロード → WebP 変換確認 → 公開 URL で表示 → 削除」の一連が動作する
  → `npm run verify:r2` が全8ステップ成功（アップロード / 公開 URL から HTTP 200 + `image/webp` / 複製 / 削除 / 削除後 404）
- [x] 数 MB のスマホ写真がアップロードでき、変換後は数百 KB 程度に収まる
  → 実測: 5.46 MB (3000×2000 JPEG) → **337 KB** (1200×800 WebP)
