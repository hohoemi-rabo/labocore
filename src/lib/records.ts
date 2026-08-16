// 授業記録のドメイン定数。
// サーバー（Server Action）とクライアント（写真ピッカー）の両方から参照するため、
// どちらの色も付かない場所に置く。
// ※ "use server" のファイルからは async 関数以外を export できないので actions.ts には置けない。

/**
 * 記録カード1件に添付できる写真の枚数（REQUIREMENTS_phase2 §7）。
 * DB 側にも `cardinality(image_urls) <= 2` の CHECK があり、ここと必ず一致させる。
 */
export const MAX_PHOTOS = 2;
