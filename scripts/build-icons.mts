import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

// 生徒向けアイコンの PNG を原本 SVG から焼き直す。`npm run icons` で実行する。
//
// 出力は public/icons/ にコミットする（Vercel のビルドで librsvg を要求しないため）。
// アイコンを差し替えるときは kiroku-icon.svg を置き換えてこれを再実行する。
//
// ⚠️ iOS はインストール済みのホーム画面アイコンを更新しない。差し替えたあと生徒さんの
//    端末に反映させるには、いったん削除して追加し直してもらう必要がある。
//    → 先行お披露目の**前に**絵柄を確定させること。

const DIR = new URL("../public/icons/", import.meta.url);
const MASTER = new URL("kiroku-icon.svg", DIR);

// 背景と同じ色。iOS 用に透明を潰すときの下地に使う。
const GROUND = "#0b0d12";

async function main() {
  const svg = await readFile(MASTER);

  // いったん 2048px で描いてから各サイズへ縮小する（density 288 = 72dpi の4倍 → 512*4）。
  // 小さいサイズを直接ラスタライズするより、曲線のアンチエイリアスがきれいになる。
  const base = await sharp(svg, { density: 288 })
    .resize(2048, 2048, { fit: "fill" })
    .png()
    .toBuffer();

  await emit(base, "kiroku-512.png", 512);
  await emit(base, "kiroku-192.png", 192);
  await emit(base, "kiroku-32.png", 32);

  // iOS 用。iOS は透明を黒に潰したうえで自前のスーパー楕円マスクをかけるので、
  // **アルファチャンネルごと落として不透明にする**（角丸も焼かない。焼くと二重丸になる）。
  const apple = await sharp(base)
    .resize(180, 180, { kernel: "lanczos3" })
    .flatten({ background: GROUND })
    .removeAlpha()
    .png()
    .toBuffer();
  await writeFile(new URL("kiroku-apple-180.png", DIR), apple);
  await report("kiroku-apple-180.png", apple);
}

async function emit(base: Buffer, name: string, size: number) {
  const out = await sharp(base)
    .resize(size, size, { kernel: "lanczos3" })
    .png()
    .toBuffer();
  await writeFile(new URL(name, DIR), out);
  await report(name, out);
}

async function report(name: string, buf: Buffer) {
  const { width, height, channels } = await sharp(buf).metadata();
  const kb = (buf.byteLength / 1024).toFixed(1);
  console.log(`  ✓ ${name.padEnd(24)} ${width}×${height}  ${channels}ch  ${kb}KB`);
}

console.log("生徒向けアイコンを生成します（原本: public/icons/kiroku-icon.svg）");
await main();
console.log("完了。変更した PNG はコミットしてください。");
