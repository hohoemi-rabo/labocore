import "server-only";
import sharp from "sharp";

// 記録カードの写真をサーバー側で縮小し WebP へ変換する（REQUIREMENTS_phase2 §11）。
// スマホの数 MB 写真をそのまま置くとシニアの回線で重く、R2 の容量も食うため。
//
// 変換は2用途で共用する（§9）:
//   掲載用   … 長辺 1200px。生徒向けページで表示する実体
//   AI 送信用 … 長辺 768px。Gemini へ送る前の縮小（チケット22）。通信量の節約が目的

/** 掲載用の長辺（要件 §11 の「長辺1200px目安」） */
export const PUBLISH_MAX_EDGE = 1200;
/** AI 送信用の長辺。読み取れれば十分なので掲載用より小さくする */
export const AI_MAX_EDGE = 768;

/** 変換後は常に WebP。R2 へ渡す Content-Type もこれで固定できる */
export const PROCESSED_CONTENT_TYPE = "image/webp";

export type ProcessImageOptions = {
  /** 長辺の上限 px。既定は掲載用の 1200 */
  maxEdge?: number;
  /** WebP の品質 (1-100)。既定 80 */
  quality?: number;
};

/**
 * 画像を「長辺 maxEdge 以内・WebP」に変換して返す。
 *
 * - 元より大きくは**しない**（`withoutEnlargement`）。小さい画像を無意味に引き伸ばさない
 * - `.rotate()` を resize より前に呼び、EXIF の Orientation を実ピクセルへ焼き込む。
 *   これを省くとスマホ写真が横倒しで表示される
 * - sharp は既定でメタデータを引き継がないため、**EXIF/GPS は変換時に落ちる**。
 *   公開ページに撮影場所の座標が乗らないので、要件 §11 の運用ルールを技術面からも支える
 */
export async function processImage(
  input: Buffer,
  { maxEdge = PUBLISH_MAX_EDGE, quality = 80 }: ProcessImageOptions = {},
): Promise<Buffer> {
  try {
    return await sharp(input)
      .rotate()
      .resize({
        width: maxEdge,
        height: maxEdge,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer();
  } catch (cause) {
    // iPhone の HEIC など sharp が扱えない形式もここに来る。
    // 呼び出し側（Server Action）がそのまま利用者に見せられる文言にしておく。
    throw new Error(
      "画像を読み込めませんでした。JPEG・PNG・WebP のいずれかでお試しください。",
      { cause },
    );
  }
}
