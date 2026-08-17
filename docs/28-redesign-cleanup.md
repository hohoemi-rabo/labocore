# 28. 仕上げ: v1 撤去・全体監査・ドキュメント同期

**依存**: 24〜27（全画面の刷新完了）
**参照**: DESIGN.md §9・§10 / REQUIREMENTS_phase2.md §12・§17
**マイルストーン**: M3（フェーズ2完了）

## 目的

新旧併存を解消し、リポジトリとドキュメントをフェーズ2完了の状態に揃える。

## Todo

- [x] 暫定白面ラッパー（24 で導入）の残骸がないことを確認し、仕組みごと削除する
  - `src/components/legacy-panel.tsx` を削除（利用箇所は 27 の時点でゼロ）
- [x] 不要になった v1 デザイントークン（primary / ink / canvas / surface-tile 系など）と Inter・旧 weight 構成を削除し、`tailwind.config.ts` / `globals.css` / `layout.tsx` を整理する（未使用トークンの削除漏れは grep で確認）
  - colors 16キー・borderRadius の `sm`/`lg`・fontFamily の `sans`（Inter 混成）を削除。`layout.tsx` から Inter の読み込みを撤去
  - `globals.css` の `body` を `bg-ground text-fg font-jp` に。**`body:has(.v2-canvas)` の出し分けは廃止**（常時ダークになったため）
  - 未使用になった v1 部品3つ（`confirm-dialog.tsx` / `toast.tsx` / `ui/form.ts`）も削除。`src/components/ui/` はディレクトリごと消えた
  - 生成 CSS が 124.0KB → 119.9KB に。`0066cc` / `1d1d1f` / `canvas-parchment` / `surface-tile` などの**痕跡ゼロ**を生成物側でも確認
- [x] 全体 grep 監査（DESIGN §10 の禁止事項）: インライン hex なし / 影・グラデは §4 のレシピ内のみ / 16px 以下の本文なし / 44px 未満のタップ要素なし / 役割色の流用なし / 装飾目的の常時アニメーションなし
  - 影・グラデの新造: 0件 ✓ / `animate-`: 0件 ✓ / 役割色の流用: なし ✓（news=お知らせ・prompt=プロンプト・off=休み/エラー・done=完了 の文脈のみ）
  - 16px 以下は 12〜15px の eyebrow・ラベル・キャプション・補助文のみで、**本文（17px 基準）に該当なし** ✓
  - **見つかった実害3件を修正**:
    1. 管理画面のファビコン `src/app/icon.svg` が **v1 色のまま**だった（`#1d1d1f` + Action Blue `#0066cc`）→ ground + スカイに
    2. `records/page.tsx` にアクセント色の hex 直書き → `DEFAULT_ACCENT`（`src/lib/accent.ts`）に置き換え
    3. **44px 未満のタップ要素**: 写真を外す×ボタン（32px）→ 44px / パンくずリンク18箇所・ヘッダーのブランドリンク → `min-h-[44px]` を付与
- [x] `DESIGN.md`（v1）を削除し、`DESIGN_v2.md` を `DESIGN.md` にリネームする（CLAUDE.md 等の参照箇所も更新）
  - 38ファイル・94箇所の `DESIGN_v2` を機械置換（すべてコメントとドキュメント本文）。新 `DESIGN.md` の冒頭に旧称の注記を残した
- [x] CLAUDE.md を更新する: フェーズ2の構成・規約（/kiroku・/records・R2・Gemini・anon RLS・v2 デザインルール）を「確立済みパターン」として追記し、v1 前提の記述を除去する
  - 冒頭のドキュメント一覧を4本（SPEC / DESIGN / REQUIREMENTS ×2）に整理し、デザインルールの v1 節を削除
- [x] SPEC.md をフェーズ2の as-built に更新する（新テーブル・RLS・画面・Server Action・環境変数・PWA・運用）
  - 表題を「フェーズ1+2」に。§2 環境変数（R2 5変数 + Gemini 2変数）/ §3 デプロイ env とアドバイザ / §7 に共通シェル v2・`/records` 4画面・`/kiroku` 3画面 / §8 に記録カード系・AI・複製・合言葉の Server Action / §10 共通部品 / §11 デザイン（v2 トークンと踏むと壊れる制約）/ §12 ディレクトリ / §13 を「これから触る人への注意」に改題
- [x] REQUIREMENTS_phase2.md §17 未決事項を消し込む（AI モデル最終選定・過去記録の探し方の様子見結果など）
  - AI モデル → `gemini-3.5-flash-lite` / 過去記録の探し方 → 当面は新しい順のみ / M1〜M3 の日程 → 2026-08 に全完了
- [ ] 最終動作確認: 全画面のスマホ/PC 表示・keepalive cron（Vercel Dashboard で実行履歴確認）・Supabase セキュリティアドバイザ
  - アドバイザは確認済み（2026-08-17）: セキュリティ WARN 1件 = 漏洩パスワード保護（**運用者タスクとして残る**）/ パフォーマンス INFO 1件 = `announcements.class_id` の FK 未インデックス（**この規模では意図的に対応しない**。SPEC §3 に記載）
  - 404 は Next 組み込みページが自前の配色（白/黒・`prefers-color-scheme` 対応）で出るため**読める**。テーマは当たらないので、気になれば `app/not-found.tsx` を足す（今回は入れていない）
  - 全画面のブラウザ確認と cron の実行履歴確認は**運用者**が実施

## 完了条件

- [x] リポジトリ内に v1 デザインの痕跡（トークン・ルール記述）がなく、ドキュメントが実装と一致している
  - `grep -rn "DESIGN_v2" .` → 0件 / `grep -rn "text-ink|bg-canvas|border-hairline|text-primary|on-dark|font-sans" src/` → 0件 / 生成 CSS にも v1 の色は残っていない
- [ ] フェーズ1機能・フェーズ2機能の全てが本番で動作している（デプロイ後に運用者が一周して確認）
