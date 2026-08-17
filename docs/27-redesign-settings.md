# 27. デザイン刷新: 設定4画面（ハブ・コマ・生徒・休講日）

**依存**: 24
**参照**: DESIGN_v2.md §8 / SPEC.md §7.5〜§7.8
**マイルストーン**: M3

## 目的

設定系の全画面を v2 化する。CRUD・検索・論理削除の挙動は一切変えない。

## Todo

- [x] 設定ハブ `/settings`: リンクリスト・ログアウトをガラスカードで刷新する
- [x] コマ管理 `/settings/classes`（一覧・new・edit・`ClassForm`）: 24 の v2 フォーム部品に乗り換える。17 で追加したテーマカラー選択欄も含めて v2 の見た目に統一する
  - 一覧に**テーマカラーのスウォッチ**を追加（生徒向けの差し色がどのコマの色か一目で分かるように）
- [x] 生徒管理 `/settings/students`（一覧・検索・new・edit・`StudentForm`・`NoClassesNotice`）: 同上。検索入力もくぼみ影+リングに
- [x] 生徒詳細 `/settings/students/[id]`: 台帳情報カード・月別出欠履歴表を v2 化する（金額の `tabular-nums` 維持）
- [x] 休講日管理 `/settings/closed-days`: 一覧+埋め込みフォームを v2 化する（過去日の muted 減光は sub 色で表現）
- [x] エラー文言はローズ・ラベル 14px/700 等、DESIGN_v2 §8 のフォーム規約に全フォームを合わせる
  - フォーム全体のエラーは `errorBandClass`（ローズ帯）、フィールド単位は `errorClass`
- [x] 挙動の維持を確認: 各 CRUD・検索絞り込み・論理削除（ConfirmDialog）・重複日付エラー・廃止済みコマの選択肢温存
  - 各 `actions.ts` は**一切変更していない**
- [x] 各画面から暫定白面ラッパーを外す
  - `settings/layout.tsx` を削除。**これで `LegacyPanel` の利用箇所はゼロ**（部品自体の削除は 28）
- [x] **React 19 のフォーム自動リセット問題を直す**（16 からの申し送り）: `<form action={formAction}>` は action が throw せずに返ると非制御フィールドをリセットするため、サーバー側エラー（休講日の重複など）で入力が消える。`ClassForm` / `ClosedDayForm` / `StudentForm` を `RecordForm`（`src/app/(app)/records/record-form.tsx`）と同じ **`startTransition` + 手動 dispatch** に寄せる
  - ただし形は `RecordForm` ではなく**24 のログインフォーム型**（`type="submit"` + `onSubmit` で `preventDefault` → 手動 dispatch）を採った。送信ボタンが1つのフォームではこちらが上位互換で、`required` のネイティブ検証と Enter 送信がそのまま効く（`reportValidity()` の手書きが要らない）。`RecordForm` は送信ボタンが2つあるための例外

## 完了条件

- [x] 設定系の全 CRUD が新デザインで動作し、リグレッションがない
