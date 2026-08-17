# 29. Next.js ベストプラクティス追従（パフォーマンス監査の指摘対応）

**依存**: 28
**参照**: CLAUDE.md「Next.js 15 App Router ベストプラクティス」/ DESIGN.md §2・§4（トークン・影のレシピ）

## 目的

vercel-react-best-practices スキル（70ルール）で全ページを監査した結果（2026-08-17）の指摘を適用する。
主目的は**体感の反応改善**：タップ→画面切り替えの間に何も表示されず「反応が悪い」と感じる問題を、
ローディング境界の追加で解消する。あわせて逐次フェッチの解消・レスポンス後処理の分離も行う。

## Todo

- [x] `settings/classes/[id]/edit` の2クエリを `Promise.all` で並列化する（`async-parallel`。2本目は `id` にしか依存しない）
- [x] `(app)/loading.tsx` を追加する（`async-suspense-boundaries`）。管理画面全ページの遷移で即座にスケルトンが出る。
      dynamic ルートでも `<Link>` の prefetch がこの境界まで効くようになり、タップ→切り替えが即時になる
- [x] `(app)/error.tsx` を追加する（Supabase 障害時に Next の素のエラー画面が出ないように）
- [x] `(kiroku)/kiroku/loading.tsx` / `error.tsx` を追加する（クラスタブは `prefetch={false}` + `force-dynamic` なので、
      タブ切り替えの無反応時間が最も長い場所。エラー文言はシニア向けの言葉遣いにする）
- [x] 生徒向け記録カード（`record-card.tsx`）と管理の記録一覧の行（`record-list.tsx`）に
      `content-visibility: auto` を付ける（`rendering-content-visibility`。記録は無制限に増えるため）
      - ⚠️ paint containment で**子孫が要素境界でクリップされる**（overflow-hidden と同じ性質）。
        いまの内容物はグローが端に届かないことを確認済み。端に寄る発光要素を足すときは外すこと
- [x] `updateRecord` / `deleteRecord` の R2 写真削除（ベストエフォート）を `after()` に逃し、
      redirect がクリーンアップを待たないようにする（`server-after-nonblocking`）
      - `deleteUnreferenced` は supabase クライアントを**引数で受ける**形に変更（レスポンス送信後に
        cookies() へ触れないため。アクション本体で作ったクライアントを閉じ込めて渡す）
- [x] `record-list.tsx` のループ内正規表現をモジュールレベルへ移す（`js-hoist-regexp`）
- [x] `npm run lint` と本番ビルド（`npm run build`）が通ることを確認する
      - `content-visibility` / `contain-intrinsic-size` が CSS に出力されていることも grep で確認済み
        （arbitrary property は color-mix の前例のように黙って消えることがあるため）

## 完了条件

- [x] lint / build 通過。データ取得・楽観的更新・CRUD のロジックは一切変えていない
- [x] 画面遷移のタップ直後にローディング表示（管理）／「読み込んでいます…」（生徒向け）が出る

## 将来メモ（本チケットでは実装しない）

- `/records` と `/kiroku/[classId]` は記録を**全件**取得・描画している。週5コマ運用で年間約250件増えるため、
  運用1年を目安に「直近N件 + もっと見る」等のページネーションを検討する（DOM 側は本チケットの
  `content-visibility` で軽減済み。残るのはデータ転送量と初回レンダー）
