# 11. 月次集計（請求額確認・ヒーロー画面）

**依存**: 09（出欠データ）、02（payments テーブル）
**参照**: REQUIREMENTS.md §4.3 / DESIGN.md §5.3・§2 / CLAUDE.md「ドメイン上の不変条件」

## 目的

月を選ぶと生徒ごとの出席回数・請求額・支払い状況と月合計が一覧できる、このアプリのヒーロー画面を実装する。

## Todo

- [x] 集計 `/summary`: 最上部にダークタイル（#272729）のフルブリードヒーロー。「YYYY年M月」ラベル（body-muted）→ 請求額合計をヒーロー数値（56px/白/600、モバイル40px、tabular-nums）→「出席のべ◯回」を 14px muted
- [x] 月送り: ヒーロー内に白の circular icon button（44px）で前月・翌月へ。ダークタイル上のアクセントは `primary-on-dark`（#2997ff）を使う
- [x] ヒーロー直下に白面の生徒別テーブル: 氏名 / 出席回数 / 欠席回数 / 請求額 / 支払いチェック。金額は右揃え・tabular-nums・`toLocaleString('ja-JP')`。行区切りは divider-soft の1pxのみ
- [x] 集計クエリ: 請求額 = `SUM(unit_price_at_time) WHERE status='present'` を当月（カレンダー月）範囲で導出する。集計テーブルは作らない。対象は当月に出欠記録がある生徒（退会者含む）
- [x] 支払いチェック: 生徒ごとのトグルで `payments` へ upsert（`UNIQUE(student_id, target_month)`、`target_month` は 'YYYY-MM'）。未払い=ゴーストピル、支払い済み=Action Blue 塗り+チェック。楽観的更新+失敗時トースト
- [x] URL で月を保持する（例: `/summary?month=2026-07`）。前月・翌月の切り替えが1タップでできること

## 完了条件

- 月を切り替えると生徒別の出席回数・請求額と月合計が正しく表示され、支払い済みフラグを付け外しできる
- 途中で生徒の単価を変更しても過去月の請求額が変わらない
