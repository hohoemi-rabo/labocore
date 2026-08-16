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

  // ⚠️ sharp のネイティブバイナリを関数バンドルへ明示的に含める。
  //
  // 既定のファイルトレースは `@img/sharp-libvips-*`（共有ライブラリ）は拾うのに、
  // **実際の N-API バインディングを持つ `@img/sharp-linux-x64` を取りこぼす**。
  // その結果 Vercel 上で `require("sharp")` が
  // 「Could not load the "sharp" module using the linux-x64 runtime」で失敗し、
  // /records・/records/new・/records/[id]/edit が 500 になっていた
  // （ローカルは node_modules がそのまま見えるため再現しない）。
  //
  // 対象は sharp を server bundle に引き込むルート＝ `/records` 配下すべて
  // （actions.ts が `@/lib/image` を import しており、記録一覧もそれを経由する）。
  // glob が何にもマッチしない環境では無視されるだけなので、他プラットフォームでも安全。
  outputFileTracingIncludes: {
    "/records": ["./node_modules/@img/**"],
    "/records/**": ["./node_modules/@img/**"],
  },
};

export default nextConfig;
