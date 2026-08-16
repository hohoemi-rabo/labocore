import sharp from "sharp";
import { PUBLISH_MAX_EDGE, processImage } from "../src/lib/image.ts";
import { copyImage, deleteImage, uploadImage } from "../src/lib/r2.ts";

// R2 の疎通確認。`npm run verify:r2` で実行する。
//
// アップロード → 公開 URL で取得 → 複製 → 削除 → 削除後 404 までを通しで確かめる。
// R2 のバケットを作り直したとき・API トークンを更新したとき・
// 「写真が表示されない」の切り分けをしたいときに使う。
//
// src/lib/r2.ts は "server-only" を import しているため、Node から実行するときは
// --conditions=react-server が要る（この条件だと server-only が no-op に解決される）。

const step = (n: number, label: string) => console.log(`\n[${n}] ${label}`);
const ok = (msg: string) => console.log(`    ✓ ${msg}`);

async function main() {
  step(1, "テスト画像を生成する（3000×2000 のノイズ画像 = スマホ写真相当）");
  const original = await sharp({
    create: {
      width: 3000,
      height: 2000,
      channels: 3,
      background: "#888888",
      // ノイズを載せて JPEG が圧縮しきれないようにする（実写に近いサイズにするため）
      noise: { type: "gaussian", mean: 128, sigma: 60 },
    },
  })
    .jpeg({ quality: 95 })
    .toBuffer();
  ok(`元画像 ${(original.length / 1024 / 1024).toFixed(2)} MB`);

  step(2, "processImage で長辺1200px + WebP へ変換する");
  const processed = await processImage(original);
  const meta = await sharp(processed).metadata();
  ok(
    `${meta.width}×${meta.height} ${meta.format} ${(processed.length / 1024).toFixed(0)} KB`,
  );
  if (Math.max(meta.width ?? 0, meta.height ?? 0) !== PUBLISH_MAX_EDGE) {
    throw new Error(`長辺が ${PUBLISH_MAX_EDGE}px になっていません`);
  }
  if (meta.format !== "webp") throw new Error("WebP になっていません");

  step(3, "R2 へアップロードする");
  const url = await uploadImage(processed);
  ok(url);

  step(4, "公開 URL から取得できることを確認する");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`公開 URL の取得に失敗: HTTP ${res.status}`);
  const fetched = Buffer.from(await res.arrayBuffer());
  ok(
    `HTTP ${res.status} / ${res.headers.get("content-type")} / ${fetched.length} bytes`,
  );
  if (fetched.length !== processed.length) {
    throw new Error("取得したバイト数がアップロードしたものと一致しません");
  }
  if (res.headers.get("content-type") !== "image/webp") {
    throw new Error("Content-Type が image/webp ではありません");
  }

  step(5, "オブジェクトを複製する（チケット23 の他クラスコピー相当）");
  const copied = await copyImage(url);
  const copiedRes = await fetch(copied);
  if (!copiedRes.ok) throw new Error(`複製先の取得に失敗: HTTP ${copiedRes.status}`);
  ok(`${copied} → HTTP ${copiedRes.status}`);

  step(6, "自バケット以外の URL は削除対象にしない");
  await deleteImage("https://example.com/not-ours.webp");
  ok("スキップされた（上の [r2] ログのとおり）");

  step(7, "両方を削除する");
  await deleteImage(url);
  await deleteImage(copied);
  ok("削除リクエストを送信");

  step(8, "削除後は取得できないことを確認する");
  // R2 は削除直後に少しだけ古い応答を返すことがあるためリトライする。
  for (const target of [url, copied]) {
    let status = 0;
    for (let i = 0; i < 5; i++) {
      status = (await fetch(target)).status;
      if (status === 404) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (status !== 404) throw new Error(`削除後も HTTP ${status} を返します: ${target}`);
  }
  ok("どちらも 404");

  console.log("\n✅ R2 の疎通確認はすべて成功しました");
}

main().catch((error) => {
  console.error("\n❌ 失敗しました\n", error);
  process.exit(1);
});
