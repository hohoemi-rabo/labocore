# 12. 仕上げ・デプロイ

**依存**: 01〜11
**参照**: REQUIREMENTS.md §8 / DESIGN.md §7（Do / Don't）

## 目的

全画面の品質確認と Vercel への本番デプロイを行い、フェーズ1を運用開始できる状態にする。

## Todo

- [x] DESIGN.md §7 Don't の総点検: 第2アクセント色・影・グラデーション・角丸中間値・出欠の赤/緑・16px以下の本文が混入していないこと（全体 grep で確認。カラーは定義トークンのみ、`backdrop-blur` は bottom-tabs のフロストガラス例外のみ、角丸は sm/lg/pill のみ、インライン hex なし）
- [x] `npm run lint` と `npm run build` が警告なしで通ること。未使用コード・未使用依存を削除（未使用の `page-placeholder.tsx` を削除。未使用依存なし）
- [x] README.md をプロジェクト用に書き換える（概要 / 主な機能 / セットアップ / 環境変数 / 管理者ユーザー作成手順 / Vercel デプロイ）
- [x] Supabase advisors（security / performance）の最終確認。RLS が全テーブルで有効であること（performance 指摘ゼロ、security は「漏洩パスワード保護 無効」の WARN 1件＝Dashboard 設定。全5テーブル RLS 有効・`(select auth.uid())` パターン確認済み。集計用に `idx_payments_target_month` を追加）
- [ ] レスポンシブ最終確認: 375px（スマホ）とPC幅で全8画面を実機/DevTools で目視確認。タップ要素が最小 44×44px を満たすこと（コード上は `h-11`/`min-h-[44px]`/セル `min-h-[56px]` で担保済み。目視は運用者作業）
- [ ] Vercel にデプロイし、環境変数（`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`）を設定する（手順は README「デプロイ（Vercel）」。運用者作業）
- [ ] 本番環境でログイン〜出欠記録〜月次集計の一連の流れをスマホ実機で確認する（運用者作業）
- [ ] 漏洩パスワード保護を Supabase Dashboard で有効化する（Authentication → Passwords）

## 完了条件

- 本番 URL でスマホから出欠記録・月次集計が問題なく使える
