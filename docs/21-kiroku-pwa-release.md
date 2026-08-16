# 21. 生徒向け PWA 対応 + M1 リリース準備

**依存**: 19, 20
**参照**: REQUIREMENTS_phase2.md §7（PWA）・§13・§16（M1）
**マイルストーン**: M1（このチケットで生徒に見せられる状態にする）

## 目的

「ホーム画面に追加」で1タップ起動できるようにし、先行お披露目まで持っていく。ホーム画面への追加操作そのものが授業の教材になる。

## Todo

- [ ] 生徒向けアイコンを作成する: デザインシステム準拠（アクセントグラデ地+モチーフ。トリコロール要素の活用を検討）。192/512/maskable/apple-touch-icon の各サイズ。**後日画像を差し替えられる構成**にする（サイト名は「ほほ笑みラボ 授業の記録」で確定済み）
- [ ] Web マニフェスト: `name`「ほほ笑みラボ 授業の記録」・`start_url` `/kiroku`・`scope` `/kiroku`・`display: standalone`・`background_color`/`theme_color` #0b0d12。`(kiroku)` layout から `<link rel="manifest">` で参照（既存管理画面には影響させない）
- [ ] iOS 用メタ（apple-touch-icon・apple-mobile-web-app 系）を `(kiroku)` layout に設定する
- [ ] iPhone（Safari）/ Android（Chrome）で「ホーム画面に追加」を実機確認する（standalone 起動・アイコン・合言葉 Cookie が引き継がれること）
- [ ] らくらくスマホ系など古めの端末で `color-mix` / `backdrop-filter` の表示を確認する（崩れる場合はフォールバックを検討・DESIGN_v2 §9 の確認項目）
- [ ] オフライン閲覧は必須としない（無理なく入れられる場合のみ検討。入れない判断でよい）

## 運用者タスク（まさゆきさん）

- [ ] 水曜午後クラスをコマ管理から登録する（テーマカラー #818cf8・フェーズ1機能で足りる）
- [ ] LINE グループでの案内文面を準備する（URL `https://labocore.vercel.app/kiroku` + 合言葉 + ホーム画面追加のすすめ）
- [ ] 数名への先行お披露目 → フィードバックを回収する

## 完了条件

- 両 OS でホーム画面追加 → 1タップで `/kiroku` が standalone で開く
- 先行お披露目に出せる状態（記録カード数件・次回・今月のよていが実データで表示されている）
