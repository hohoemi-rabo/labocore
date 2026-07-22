import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

// 欧文・数字は Inter（可変フォントのため weight 指定なし）
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// 和文は Noto Sans JP。ウェイト梯子は 400/600 のみ（DESIGN.md §2）。
// CJK はファイルが巨大なため preload は無効化する。
const notoSansJP = Noto_Sans_JP({
  weight: ["400", "600"],
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
      <body className={`${inter.variable} ${notoSansJP.variable}`}>
        {children}
      </body>
    </html>
  );
}
