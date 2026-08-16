import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 記録カードは写真を最大2枚受け取る（チケット16）。Server Action のボディ既定は
      // 1MB で、スマホ写真だと1枚で超える。縮小はサーバー側（src/lib/image.ts）で
      // 行うため、元サイズのまま届く前提で余裕を持たせる。
      bodySizeLimit: "10mb",
    },
  },

  // images.remotePatterns は設けない。記録カードの写真はアップロード時点で
  // 長辺1200px+WebP に変換済みなので next/image で再最適化する実益がなく、
  // 素の <img loading="lazy"> で配信する（チケット15/20 で決定）。
  // R2 の公開ドメインを設定に固定しないぶん、将来 r2.dev から移行するのも楽になる。
};

export default nextConfig;
