import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

// 欧文・和文とも Noto Sans JP（DESIGN.md §5）。
// フェーズ1で併用していた Inter は、全画面が v2 になった 28 で撤去した。
// 400/500/700/900 を使うため、weight を列挙せず**可変フォント**で読み込む。
// 静的5ウェイトだと Noto Sans JP のサブセット 124 個 × 5 の @font-face が生成され、
// フォント CSS が 469KB（gzip 165kB）に膨らむ。可変フォントなら 124KB（gzip 40kB）で
// 100〜900 の全ウェイトをまかなえる（フェーズ1の2ウェイト構成より軽い）。
// CJK はファイルが巨大なため preload は無効化する。
const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "LaboCore",
  description: "ほほ笑みラボ 教室運営システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={notoSansJP.variable}>
        {children}
      </body>
    </html>
  );
}
