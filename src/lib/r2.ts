import "server-only";
import { randomUUID } from "node:crypto";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
// 拡張子付きで書く。scripts/verify-r2.mts が Node から直接実行するため
// （Node の ESM 解決は拡張子を省略できない）。tsconfig の allowImportingTsExtensions 前提。
import { PROCESSED_CONTENT_TYPE } from "./image.ts";

// 記録カードの写真を Cloudflare R2（S3 互換）に置く（REQUIREMENTS_phase2 §11）。
// R2 は無料枠 10GB・配信の帯域課金なしで、この規模では実質恒久無料。
//
// DB には R2_PUBLIC_BASE_URL + キーの「完全な公開 URL」を保存する（要件 §11）。
// 将来 r2.dev から別の配信先へ移すとき、DB の値をそのまま置換すれば済むようにするため。

const ENV_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_BASE_URL",
] as const;

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** 末尾スラッシュを落とした公開 URL のベース */
  publicBaseUrl: string;
};

// env はモジュール読み込み時ではなく呼び出し時に検証する。
// 未設定でもアプリ全体は起動でき、写真を扱う操作だけが分かりやすく失敗する。
function readConfig(): R2Config {
  const missing = ENV_KEYS.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `R2 の環境変数が未設定です: ${missing.join(", ")}（README の「写真の保存先（Cloudflare R2）」を参照）`,
    );
  }

  return {
    accountId: process.env.R2_ACCOUNT_ID!,
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    bucket: process.env.R2_BUCKET!,
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL!.replace(/\/+$/, ""),
  };
}

let cached: { client: S3Client; config: R2Config } | null = null;

function getClient() {
  if (cached) return cached;

  const config = readConfig();
  const client = new S3Client({
    // R2 はリージョンの概念を持たないが SigV4 の署名に値が要るため "auto" を使う。
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // AWS SDK v3 は既定（WHEN_SUPPORTED）だと x-amz-checksum-* を送る。
    // R2 側は 2025-02 に対応済みで、Cloudflare の互換性ノートも削除されたため
    // **既定のままでも現在は動く**。それでも明示するのは保険:
    // ボディが Buffer なら普通のヘッダで送られるが、ストリームだと
    // aws-chunked のトレーラ方式になり、こちらは R2 が未対応。
    // 将来ここをストリームに変えた人が踏まないようにしておく。
    // SigV4 が署名済みペイロードハッシュで完全性を担保しているので実害はない。
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  cached = { client, config };
  return cached;
}

const publicUrlFor = (config: R2Config, key: string) =>
  `${config.publicBaseUrl}/${key}`;

// このモジュールが作るキーの形。これ以外は自分の管理下のオブジェクトとみなさない。
const KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

/**
 * 公開 URL からオブジェクトキーを取り出す。形が違えば null。
 *
 * **ベース URL との前方一致では判定しない**。DB に完全な URL を保存しているのは
 * 将来 r2.dev から独自ドメイン等へ移すためで（要件 §11）、前方一致にすると
 * 移行した瞬間に既存行の URL が全部マッチしなくなり、削除も複製もできなくなる。
 * キーの形（UUID + .webp）だけで判定すれば、ホストが変わっても動き続ける。
 */
function keyFromUrl(url: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }

  const key = pathname.split("/").pop() ?? "";
  return KEY_PATTERN.test(key) ? key : null;
}

/**
 * `processImage` の出力を R2 へ置き、完全な公開 URL を返す。
 * キーは UUID にする（公開バケットなので、推測してたどれないようにする）。
 *
 * 受け取るのは常に WebP（`processImage` の出力）なので Content-Type と拡張子は固定する。
 * 引数で変えられるようにすると、拡張子と中身が食い違う余地が生まれる。
 */
export async function uploadImage(body: Buffer): Promise<string> {
  const { client, config } = getClient();
  const key = `${randomUUID()}.webp`;

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: PROCESSED_CONTENT_TYPE,
      // キーは UUID で中身が変わることがないため、恒久キャッシュにしてよい。
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return publicUrlFor(config, key);
}

/**
 * 公開 URL の画像を削除する。**ベストエフォート**（要件 §11・チケット15）。
 * R2 側の失敗で呼び出し元の DB 操作を巻き添えにしない。
 * 消し損ねたオブジェクトは無料枠 10GB の範囲で許容する。
 */
export async function deleteImage(url: string): Promise<void> {
  try {
    const { client, config } = getClient();
    const key = keyFromUrl(url);
    if (!key) {
      console.error("[r2] このモジュールが作った URL ではないため削除をスキップ:", url);
      return;
    }

    await client.send(
      new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
    );
  } catch (error) {
    console.error("[r2] 画像の削除に失敗しました:", url, error);
  }
}

/**
 * 既存オブジェクトを別キーへ複製し、新しい公開 URL を返す（チケット23 の他クラスコピー用）。
 * URL を共有せずオブジェクトごと複製するのは、
 * 元カードを削除したときに複製側の写真まで消えないようにするため。
 */
export async function copyImage(url: string): Promise<string> {
  const { client, config } = getClient();
  const sourceKey = keyFromUrl(url);
  if (!sourceKey) {
    throw new Error(`複製できない画像 URL です: ${url}`);
  }

  const key = `${randomUUID()}.webp`;
  await client.send(
    new CopyObjectCommand({
      Bucket: config.bucket,
      Key: key,
      // CopySource は "バケット名/キー" を URL エンコードした形で渡す。
      CopySource: `${config.bucket}/${encodeURIComponent(sourceKey)}`,
    }),
  );

  return publicUrlFor(config, key);
}
