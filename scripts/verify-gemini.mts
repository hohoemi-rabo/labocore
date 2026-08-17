import sharp from "sharp";
import { AI_MAX_EDGE } from "../src/lib/image.ts";
import {
  DEFAULT_GEMINI_MODEL,
  generateRecordDraft,
  geminiModel,
  isGeminiConfigured,
} from "../src/lib/gemini.ts";

// AI 下書き（Gemini）の疎通確認。`npm run verify:gemini` で実行する。
//
// 「API キーが有効か」「GEMINI_MODEL のモデルが実在して呼べるか」「画像付きで
// 構造化出力が返るか」をブラウザなしで確かめる。**モデルを差し替えたとき**や、
// 「AI下書きが失敗する」の切り分けをしたいときに使う。
//
// src/lib/gemini.ts は "server-only" を import しているため、Node から実行するときは
// --conditions=react-server が要る（この条件だと server-only が no-op に解決される）。

const step = (n: number, label: string) => console.log(`\n[${n}] ${label}`);
const ok = (msg: string) => console.log(`    ✓ ${msg}`);

const NOTE =
  "暑中見舞いをAIで作った。写真の入れ方でつまずく人が多かった。印刷まで全員できた。";

async function main() {
  step(1, "環境変数を確認する");
  if (!isGeminiConfigured()) {
    throw new Error(
      "GEMINI_API_KEY が未設定です（README の「AI 下書き（Gemini）」を参照）",
    );
  }
  const model = geminiModel();
  ok(
    `model = ${model}${model === DEFAULT_GEMINI_MODEL ? "（既定）" : "（GEMINI_MODEL で指定）"}`,
  );

  step(2, "テスト画像を生成する（掲載用より大きい 1600px = 縮小されることの確認用）");
  const image = await sharp({
    create: {
      width: 1600,
      height: 1000,
      channels: 3,
      background: "#f0f5ff",
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="1600" height="1000"><rect x="80" y="80" width="1440" height="200" fill="#38bdf8"/><text x="120" y="215" font-size="96" fill="white">Summer Greeting Card</text><text x="120" y="520" font-size="72" fill="#333">Photo -&gt; Card -&gt; Print</text></svg>`,
        ),
        top: 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();
  ok(`${(image.length / 1024).toFixed(0)} KB（送信前に長辺 ${AI_MAX_EDGE}px へ縮小される）`);

  step(3, "走り書きメモ + 画像から下書きを作る");
  const started = Date.now();
  const draft = await generateRecordDraft({ note: NOTE, images: [image] });
  ok(`${Date.now() - started} ms`);

  console.log(`\n    テーマ    : ${draft.theme}`);
  console.log(`    ひとことメモ: ${draft.memo}`);

  if (draft.theme.length > 40) {
    console.warn("\n⚠️  テーマが長めです（プロンプトの指示は20字以内）");
  }

  console.log("\n✅ AI 下書きの疎通確認に成功しました");
}

main().catch((error) => {
  console.error("\n❌ 失敗しました\n", error);
  process.exit(1);
});
