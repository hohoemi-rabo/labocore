# 12. 仕上げ・デプロイ

**依存**: 01〜11
**参照**: REQUIREMENTS.md §8 / DESIGN.md §7（Do / Don't）

## 目的

全画面の品質確認と Vercel への本番デプロイを行い、フェーズ1を運用開始できる状態にする。

## Todo

- [ ] レスポンシブ最終確認: 375px（スマホ）とPC幅で全8画面を確認。タップ要素が最小 44×44px を満たすこと
- [ ] DESIGN.md §7 Don't の総点検: 第2アクセント色・影・グラデーション・角丸中間値・出欠の赤/緑・16px以下の本文が混入していないこと
- [ ] `npm run lint` と `npm run build` が警告なしで通ること。未使用コード・未使用依存を削除
- [ ] README.md をプロジェクト用に書き換える（概要 / セットアップ / 環境変数 / 管理者ユーザー作成手順）
- [ ] Vercel にデプロイし、環境変数（`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`）を設定する
- [ ] 本番環境でログイン〜出欠記録〜月次集計の一連の流れをスマホ実機で確認する
- [ ] Supabase advisors（security / performance）の最終確認。RLS が全テーブルで有効であること

## 完了条件

- 本番 URL でスマホから出欠記録・月次集計が問題なく使える
