import type { Metadata, Viewport } from "next";

// ⚠️ /kiroku 配下は必ず動的レンダリングにする（チケット18 からの申し送り）。
//
// 生徒向けページは cookie ベースの Supabase クライアントではなく anon クライアントで読むため、
// 管理画面と違ってルートキャッシュが効いてしまう。お知らせの掲載期間と「次回のじゅぎょう」の
// 過去日判定は時刻で状態が変わるのに、日付をまたいでも何のミューテーションも起きないので
// revalidatePath は走らない。そのままだと期限切れのお知らせが生徒に出続ける。
// RLS は毎リクエスト now() を評価するので、リクエストが DB に届きさえすれば正しく消える。
//
// クラスえらび（/kiroku/select）は cookie を1つも読まないため、これが無いと
// ビルド時にプリレンダされ、クラス一覧がビルドに焼き付く（新しいコマを登録しても出てこない）。
//
// layout の dynamic は配下の **page** に継承される（route handler には継承されない点に注意）。
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "ほほ笑みラボ 授業の記録",
    template: "%s｜ほほ笑みラボ 授業の記録",
  },
  description: "ほほ笑みラボの授業のようすをまとめたページです。",
  // 生徒向けページは検索結果に出さない（REQUIREMENTS_phase2 §5）。
  robots: { index: false, follow: false },

  // ── PWA（チケット21）─────────────────────────────────────
  // マニフェストは public/ の実ファイル。middleware の matcher が拡張子で除外しているので
  // 未ログインの生徒でも 200 で取れる。
  // ⚠️ app/manifest.ts のファイル規約は使えない。(kiroku) 配下に置くと無言で無視され、
  //    アプリルートに置くと管理画面まで <link rel="manifest"> が付く。
  manifest: "/manifest.webmanifest",

  // ⚠️ ここに icons を書いた時点で、この配下では**ファイル規約のアイコンが全部無効**になる
  //    （Next は resolvedMetadata.icons が falsy のときしか規約アイコンを入れない）。
  //    つまり src/app/icon.svg（管理画面の L マーク）は /kiroku には出なくなる。これは意図どおり。
  //    ただし apple だけ書くと icon が空になるので、**両方列挙する**こと。
  //    管理画面は別のセグメント鎖で解決されるため影響ゼロ。
  //    絵柄の差し替えは public/icons/kiroku-icon.svg を置き換えて `npm run icons`。
  icons: {
    icon: [
      { url: "/icons/kiroku-icon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/icons/kiroku-32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      { url: "/icons/kiroku-apple-180.png", type: "image/png", sizes: "180x180" },
    ],
  },

  appleWebApp: {
    capable: true,
    // ホーム画面でアイコンの下に出る名前。長いと省略されるので短く（manifest の short_name と揃える）。
    title: "授業の記録",
    // black-translucent にしない。Web View がステータスバーの下まで広がり、
    // sticky top-0 のヘッダー（kiroku-header.tsx）に時計とバッテリーが重なる。
    // ダーク基調なので default（明るいバー）ではなく black。
    statusBarStyle: "black",
  },

  other: {
    // Next 15.5 は capable: true でもプレフィックス無しの mobile-web-app-capable しか出さない。
    // manifest の display:standalone があれば iOS 11.3 以降は standalone で開くが、
    // 完了条件が「両 OS で standalone」なので旧名も保険で出しておく。
    "apple-mobile-web-app-capable": "yes",
  },
};

// themeColor は metadata では非推奨（Next 14 以降）。viewport 側に置く。
//
// ⚠️ maximumScale / userScalable: false を入れないこと。シニアの方がピンチズームで
//    文字を大きくできなくなる。この export を足しても Next 既定の
//    `width=device-width, initial-scale=1` は消えないので、ズームは維持される。
// ⚠️ viewportFit: "cover" も入れない。env(safe-area-inset-*) を各所に入れない限り、
//    iOS で時計がヘッダーに、ホームバーが「クラスをえらびなおす」に重なる。
export const viewport: Viewport = {
  themeColor: "#0b0d12",
  // オーバースクロールやスクロールバーなど、UA が描く面もダークに寄せる。
  colorScheme: "dark",
};
export default function KirokuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 面は各ページが entryCanvasClass / kirokuCanvasClass で敷く。
  // ここでキャンバスを敷くと入口画面のアンビエントが二重になる。
  return children;
}
