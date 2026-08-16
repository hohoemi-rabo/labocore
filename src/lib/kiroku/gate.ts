// 生徒向けページ `/kiroku` の合言葉ゲート（REQUIREMENTS_phase2 §4）。
//
// ⚠️ このファイルは **Edge ランタイムの middleware** と **Node の Server Action** の
//    両方から import される。`next/headers` も Supabase も絶対に import しないこと
//    （middleware のバンドルが壊れる）。Cookie の読み書きは呼び出し側の責務。
//
// セキュリティの位置づけ（正直な注記）: 合言葉はアプリ層の「身内向けの目印」であり、
// 授業記録系テーブルは anon に読み取りを許可しているため、API を直接叩けば合言葉なしでも読める。
// 掲載内容を「顔なし・個人情報なしの授業記録」に限定する運用でカバーする方針
// （生徒台帳・出欠・支払いは anon 完全遮断のまま）。

export const KIROKU_COOKIE = "kiroku_gate";
export const KIROKU_CLASS_COOKIE = "kiroku_class";
export const KIROKU_COOKIE_PATH = "/kiroku";

/** 合言葉 Cookie の寿命。一度入れたら1年は聞かれない（REQUIREMENTS_phase2 §4）。 */
export const KIROKU_MAX_AGE = 60 * 60 * 24 * 365;

// 2本の Cookie で共通。set にも delete にもこの1つを使い、属性がずれないようにする。
//   path   : /kiroku 配下でしか読まないので、管理画面や API のリクエストには載せない。
//            ⚠️ cookies().delete(name) は path=/ で消しにいくため、この Cookie には効かない。
//            消すときは set(name, "", { ...kirokuCookieOptions, maxAge: 0 }) を使うこと。
//   sameSite: lax 必須。strict にすると LINE のリンクから来た初回遷移で Cookie が送られず、
//            毎回合言葉画面に戻ってしまう。
//   secure : 本番のみ。Safari は http://192.168.x.x:3000 で Secure Cookie を捨てるため、
//            常時 true にするとスマホ実機での確認ができなくなる。
//   maxAge : 省くとセッション Cookie になり「ブラウザを閉じて再訪問」で消える。
export const kirokuCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: KIROKU_COOKIE_PATH,
  maxAge: KIROKU_MAX_AGE,
} as const;

// Cookie には合言葉そのものではなく、そこから導出した値を入れる。
// これは秘密ではない（合言葉を知っていれば誰でも計算でき、この pepper もリポジトリにある）。
// 狙いは「KIROKU_PASSWORD を変えたら、配布済みの Cookie が自動的に無効になる」こと。
const PEPPER = "labocore:kiroku:v1:";

let tokenPromise: Promise<string | null> | null = null;

/**
 * 現在の `KIROKU_PASSWORD` に対応する Cookie 値。env 未設定なら null（fail-closed）。
 *
 * Node の crypto ではなく **Web Crypto** を使う（`require("crypto")` は Edge ビルドを壊す）。
 * 結果は isolate 内でメモ化する。env はプロセスの生存中に変わらない。
 */
export function kirokuToken(): Promise<string | null> {
  tokenPromise ??= computeToken();
  return tokenPromise;
}

async function computeToken(): Promise<string | null> {
  // env 側も trim する。Vercel の入力欄に改行込みで貼られると全生徒がロックアウトされ、
  // しかも症状が「合言葉の打ち間違い」と見分けられなくなる。
  const password = normalize(process.env.KIROKU_PASSWORD);
  if (!password) return null;

  const bytes = new TextEncoder().encode(`${PEPPER}${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 入力とenv の表記ゆれを吸収する。全角/半角の合成差（NFC）と前後空白。 */
export function normalize(value: string | undefined | null): string {
  return (value ?? "").normalize("NFC").trim();
}

/** 合言葉が一致しているか。入力された合言葉の平文と比較する。 */
export function matchesKirokuPassword(input: string): boolean {
  const expected = normalize(process.env.KIROKU_PASSWORD);
  return expected !== "" && normalize(input) === expected;
}

/** Cookie の値がいまの合言葉に対応しているか。middleware とページの両方がこれを使う。 */
export async function isKirokuUnlocked(value: string | undefined): Promise<boolean> {
  const token = await kirokuToken();
  return token !== null && value === token;
}
