import "server-only";
import { randomUUID } from "node:crypto";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { PROCESSED_CONTENT_TYPE } from "./image";

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
    // これは S3 互換ストアで受け付けられないことがあり、R2 でも過去に 400 の原因になった。
    // SigV4 が署名済みペイロードハッシュで完全性を担保しているので、
    // 追加のチェックサムは必要なときだけに絞る。
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  cached = { client, config };
  return cached;
}

const publicUrlFor = (config: R2Config, key: string) =>
  `${config.publicBaseUrl}/${key}`;

/**
 * 公開 URL からオブジェクトキーを取り出す。
 * 自分のバケットの URL でなければ null（他所の URL を渡されても何もしないため）。
 */
function keyFromUrl(config: R2Config, url: string): string | null {
  const prefix = `${config.publicBaseUrl}/`;
  if (!url.startsWith(prefix)) return null;

  const key = url.slice(prefix.length);
  // パス区切りやクエリを含む値は想定外（キーは "{uuid}.webp" のみ）。
  return key.length > 0 && !key.includes("/") && !key.includes("?") ? key : null;
}

/**
 * 変換済み画像を R2 へ置き、完全な公開 URL を返す。
 * キーは UUID にする（公開バケットなので、推測してたどれないようにする）。
 */
export async function uploadImage(
  body: Buffer,
  contentType: string = PROCESSED_CONTENT_TYPE,
): Promise<string> {
  const { client, config } = getClient();
  const key = `${randomUUID()}.webp`;

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
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
    const key = keyFromUrl(config, url);
    if (!key) {
      console.error("[r2] 自バケットの URL ではないため削除をスキップ:", url);
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
  const sourceKey = keyFromUrl(config, url);
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
