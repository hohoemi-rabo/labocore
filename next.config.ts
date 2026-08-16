import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 記録カードは写真を最大2枚受け取る（チケット16）。Server Action のボディ既定
      // 1MB では足りないので引き上げる。
      //
      // ただし **Vercel の実質上限は 4.5MB**（プラットフォーム側で 413
      // FUNCTION_PAYLOAD_TOO_LARGE になる。関数に届く前に切られるので、ここを
      // それより大きくしても意味がない）。それ以上を書くと Next のエラーではなく
      // Vercel の 413 が返り、Server Action 側で捕捉できなくなるため 4mb に留める。
      // → スマホ写真はブラウザ側で縮小してから送る（src/lib/image-client.ts）。
      bodySizeLimit: "4mb",
    },
  },

  // images.remotePatterns は設けない。記録カードの写真はアップロード時点で
  // 長辺1200px+WebP に変換済みなので next/image で再最適化する実益がなく、
  // 素の <img loading="lazy"> で配信する（チケット15/20 で決定）。
  // R2 の公開ドメインを設定に固定しないぶん、将来 r2.dev から移行するのも楽になる。
};

export default nextConfig;
