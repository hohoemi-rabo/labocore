// ブラウザ側の事前縮小。Client Component から使う（`src/lib/image.ts` はサーバー側）。
//
// なぜ必要か: **Vercel のリクエストボディ上限は 4.5MB** で、これはプラットフォーム側で
// 切られるため Next の `serverActions.bodySizeLimit` では超えられない。
// スマホ写真は1枚で 3〜5MB あり、2枚送ると確実に 413 になる。
// そこで送信前にブラウザで縮小し、サーバー側（image.ts）が最終的な
// 長辺1200px + WebP へ仕上げる、という二段構えにする。
//
// 副次的な効果:
// - **HEIC 問題が消える**。sharp は HEIC を読めない（ライセンス上プリビルドに含まれない）が、
//   ブラウザは OS のデコーダで開けるので、canvas を通した時点で扱える形式になる
// - EXIF がこの時点で落ちる（canvas 出力にメタデータは乗らない）

/** ブラウザ側で縮小する長辺。サーバー側の 1200px より大きめに取り、劣化を二重にしない */
export const CLIENT_MAX_EDGE = 2000;

/** これ以下かつ扱える形式ならそのまま送る（無駄な再エンコードで劣化させない） */
const SKIP_BELOW_BYTES = 1_000_000;

/** ブラウザ・sharp の双方が確実に扱える入力形式 */
const PASSTHROUGH_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ShrinkOptions = {
  maxEdge?: number;
  /** 0〜1。テキストの多いスクリーンショットを想定して既定は高め */
  quality?: number;
};

/**
 * 画像ファイルを送信前に縮小する。縮小できない場合は元のファイルをそのまま返す
 * （サーバー側で改めて検証・変換するので、ここで失敗させない）。
 */
export async function shrinkImageInBrowser(
  file: File,
  { maxEdge = CLIENT_MAX_EDGE, quality = 0.9 }: ShrinkOptions = {},
): Promise<File> {
  // 元から小さく、そのまま送れる形式なら触らない
  if (file.size <= SKIP_BELOW_BYTES && PASSTHROUGH_TYPES.has(file.type)) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    // imageOrientation: EXIF の回転を描画時に反映させる。
    // canvas 出力には EXIF が乗らないので、ここで焼き込まないと横倒しのまま確定する。
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // 読めない形式はサーバー側に判断を委ねる（利用者向けの文言は image.ts が持つ）
    return file;
  }

  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    // WebP はテキストの多いスクリーンショットで JPEG より劣化が少ない。
    // 未対応ブラウザは PNG にフォールバックするので、下でサイズを見て採否を決める。
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (!blob) return file;

    // フォールバックで PNG になった等で元より大きくなったら、縮小した意味がない。
    // ただし元が扱えない形式（HEIC 等）なら、大きくても変換後を使うしかない。
    if (blob.size >= file.size && PASSTHROUGH_TYPES.has(file.type)) {
      return file;
    }

    const ext = blob.type === "image/webp" ? "webp" : "png";
    return new File([blob], `${stripExtension(file.name)}.${ext}`, {
      type: blob.type,
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}

const stripExtension = (name: string) => name.replace(/\.[^./\\]+$/, "");
