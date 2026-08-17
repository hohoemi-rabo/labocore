import { glassCardClass, v2CanvasClass } from "@/components/v2/styles";

// 管理画面全ページ共通のローディング境界（チケット29）。
//
// これが無いと、遷移先のデータ取得（Supabase の往復）が終わるまで前の画面が
// 表示されたままになり、タップしても無反応に見える。境界があると Next は
// タップ直後にまずこれを描き、あわせて dynamic ルートでも <Link> の prefetch が
// この境界まで効くようになる（シェルのヘッダー・下部タブは layout 側なので残る）。
export default function AppLoading() {
  return (
    <div className={v2CanvasClass} aria-busy="true">
      <div className="animate-pulse" aria-hidden>
        <div className="mb-6 h-8 w-44 rounded-12 bg-white/[0.06]" />
        <div className={`${glassCardClass} mb-4 h-24`} />
        <div className={`${glassCardClass} h-64`} />
      </div>
      <p className="sr-only">読み込んでいます</p>
    </div>
  );
}
