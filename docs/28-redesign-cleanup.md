# 28. 仕上げ: v1 撤去・全体監査・ドキュメント同期

**依存**: 24〜27（全画面の刷新完了）
**参照**: DESIGN_v2.md §9・§10 / REQUIREMENTS_phase2.md §12・§17
**マイルストーン**: M3（フェーズ2完了）

## 目的

新旧併存を解消し、リポジトリとドキュメントをフェーズ2完了の状態に揃える。

## Todo

- [ ] 暫定白面ラッパー（24 で導入）の残骸がないことを確認し、仕組みごと削除する
- [ ] 不要になった v1 デザイントークン（primary / ink / canvas / surface-tile 系など）と Inter・旧 weight 構成を削除し、`tailwind.config.ts` / `globals.css` / `layout.tsx` を整理する（未使用トークンの削除漏れは grep で確認）
- [ ] 全体 grep 監査（DESIGN_v2 §10 の禁止事項）: インライン hex なし / 影・グラデは §4 のレシピ内のみ / 16px 以下の本文なし / 44px 未満のタップ要素なし / 役割色の流用なし / 装飾目的の常時アニメーションなし
- [ ] `DESIGN.md`（v1）を削除し、`DESIGN_v2.md` を `DESIGN.md` にリネームする（CLAUDE.md 等の参照箇所も更新）
- [ ] CLAUDE.md を更新する: フェーズ2の構成・規約（/kiroku・/records・R2・Gemini・anon RLS・v2 デザインルール）を「確立済みパターン」として追記し、v1 前提の記述を除去する
- [ ] SPEC.md をフェーズ2の as-built に更新する（新テーブル・RLS・画面・Server Action・環境変数・PWA・運用）
  - §2 の環境変数表は **`R2_*` 5変数と `GEMINI_API_KEY` / `GEMINI_MODEL` が未記載**、§8 の Server Actions 一覧は **`/records` 配下（記録カード CRUD・`setRecordStatus`・`next-lessons`・`announcements`・`generateDraft`）が丸ごと未記載**。§4 の DB だけが同期済みなので、ここを揃える
- [ ] REQUIREMENTS_phase2.md §17 未決事項を消し込む（AI モデル最終選定・過去記録の探し方の様子見結果など）
- [ ] 最終動作確認: 全画面のスマホ/PC 表示・keepalive cron（Vercel Dashboard で実行履歴確認）・Supabase セキュリティアドバイザ

## 完了条件

- リポジトリ内に v1 デザインの痕跡（トークン・ルール記述）がなく、ドキュメントが実装と一致している
- フェーズ1機能・フェーズ2機能の全てが本番で動作している
