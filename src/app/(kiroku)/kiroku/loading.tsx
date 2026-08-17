import { kirokuCanvasClass, tricolorSmClass } from "@/components/v2/styles";

// 生徒向け /kiroku 配下共通のローディング境界（チケット29）。
//
// クラスタブは prefetch={false} + force-dynamic なので、タブを押してから
// サーバーの応答が返るまでが全画面で最も長い「無反応」だった。この境界で
// タップ直後に切り替わる。面は各ページと同じ kirokuCanvasClass を敷く
// （(kiroku)/layout.tsx はキャンバスを持たない pass-through のため）。
export default function KirokuLoading() {
  return (
    <div
      className={`${kirokuCanvasClass} flex flex-col items-center justify-center`}
      aria-busy="true"
    >
      <div className={`${tricolorSmClass} mb-4`} aria-hidden />
      <p className="animate-pulse text-[17px] font-bold text-sub">
        読み込んでいます…
      </p>
    </div>
  );
}
