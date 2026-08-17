import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
// 拡張子付きの相対 import で書く。r2.ts と同じ理由で、scripts/verify-gemini.mts が
// Node から直接実行するため（Node の ESM 解決は拡張子を省略できず、@/ の別名も引けない）。
import { AI_MAX_EDGE, PROCESSED_CONTENT_TYPE, processImage } from "./image.ts";

// 記録カードの下書き生成（REQUIREMENTS_phase2 §9・チケット22）。
//
// 走り書きメモ + その日のスクリーンショットから「テーマ」「ひとことメモ」を作らせる。
// **AI はあくまで補助**で、生成結果はフォームに入るだけ。公開は必ず人の操作で行う（要件 §15）。
// この文脈で守っていること:
//   - API キーはサーバー専用（NEXT_PUBLIC_ を付けない）
//   - 無料枠に送った入力は Google の製品改善に利用されうるため、個人情報を送らない運用ルールを敷く
//     （UI 側にも注記があり、システム指示でも出力させない）
//   - env 未設定・API 障害でも手動作成と公開は妨げない（呼び出し側が握りつぶさずトーストで伝える）

/**
 * `GEMINI_MODEL` 未設定時に使うモデル。
 *
 * **モデル ID をコードの他の場所へ散らかさない。** Gemini は世代交代と提供終了が早いので、
 * 切り替えは env（`GEMINI_MODEL`）だけで済むようにしてある（要件 §9）。
 * 2026-08 時点で無料枠がある Flash 系は 3.7 / 3.6 / 3.5 Flash と 3.5 / 3.1 Flash-Lite。
 * 短い見出し + 2〜3文の生成には Flash-Lite で足りるため、いちばん軽いものを既定にする。
 */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

/** リクエストのタイムアウト。`/records` の maxDuration = 60s の内側に収める */
const REQUEST_TIMEOUT_MS = 45_000;

/** AI へ渡すメモの上限（暴発したペーストで無料枠を溶かさないための保険） */
export const MAX_NOTE_LENGTH = 2000;

export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

/**
 * AI 下書きが使える状態か。画面側はこれでボタンの可否を出し分ける
 * （キーが無いときに押せてしまうと「押しても何も起きない」ように見えるため）。
 */
export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

/**
 * 利用者にそのまま見せられる日本語メッセージを持つエラー。
 * 呼び出し側（Server Action）は `message` をトーストに流すだけでよい。
 */
export class GeminiDraftError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "GeminiDraftError";
  }
}

const MESSAGES = {
  notConfigured:
    "AI の下書きは今使えません（サーバーの設定が未完了です）。手入力で作成できます。",
  rateLimited:
    "AI が混み合っています。1分ほど待ってから、もう一度お試しください。",
  auth: "AI の設定に問題があります（API キーを確認してください）。",
  model:
    "AI のモデル設定が正しくありません（GEMINI_MODEL を確認してください）。",
  server: "AI 側で問題が起きています。時間をおいてもう一度お試しください。",
  timeout:
    "AI の応答がありませんでした。通信環境を確認して、もう一度お試しください。",
  unreadable:
    "AI の返答を読み取れませんでした。メモを少し変えて、もう一度お試しください。",
  unknown: "AI の下書きを作れませんでした。もう一度お試しください。",
} as const;

// 生成プロンプト（コード上の定数として管理する。チケット22 の Todo）。
// 読み手はシニアの生徒さんなので、教室の温かいトーン・やさしい語彙を明示的に指示する。
const SYSTEM_INSTRUCTION = `あなたは、シニア向けパソコン・スマホ教室「ほほ笑みラボ」の先生を手伝うアシスタントです。
先生の走り書きメモと、その日の授業で使った画面のスクリーンショットをもとに、
生徒さん（60〜80代）が読む「授業の記録」の下書きを日本語で作ります。

出力するのは次の2つだけです。
- theme: その日の授業のテーマ。短い体言止めで20字以内。記号・絵文字・句点は使わない。
- memo: 授業の様子が伝わるひとことメモ。です・ます調で2〜3文。

必ず守ること:
- 生徒さんに語りかけるような、温かく穏やかな調子で書く。専門用語は避け、やさしい言葉を選ぶ。
- 走り書きメモと画像から読み取れることだけを書く。分からないことを補って作らない。
- 画像があるときは、そこに写っているもの（使ったアプリ、作ったもの）を文章の中身に反映する。
  ただし「画像」「写真」「画面」といった言葉自体は使わず、その日にやったこととして書く。
- 個人名・住所・電話番号・メールアドレスなどの個人情報は書かない。画像に写っていても書き写さない。
- 誇張した宣伝文句、次回の予告、生徒さんへの指示は書かない。その日にやったことの報告として書く。`;

// 構造化出力。responseMimeType と対で指定する（片方だけでは効かない）。
const DRAFT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    theme: {
      type: Type.STRING,
      description: "授業のテーマ。短い体言止めで20字以内",
    },
    memo: {
      type: Type.STRING,
      description: "授業の様子を伝えるひとことメモ。です・ます調で2〜3文",
    },
  },
  required: ["theme", "memo"],
  propertyOrdering: ["theme", "memo"],
};

// モデルは JSON を返すが、内容の形までは保証されない（空文字・欠損はありうる）ので検証する。
const draftResultSchema = z.object({
  theme: z.string().trim().min(1),
  memo: z.string().trim().min(1),
});

export type RecordDraft = z.infer<typeof draftResultSchema>;

// env はモジュール読み込み時ではなく呼び出し時に見る（r2.ts と同じ方針）。
// 未設定でもアプリ全体は起動でき、AI を使う操作だけが分かりやすく失敗する。
let cached: { apiKey: string; client: GoogleGenAI } | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new GeminiDraftError(MESSAGES.notConfigured);

  if (cached?.apiKey !== apiKey) {
    cached = { apiKey, client: new GoogleGenAI({ apiKey }) };
  }
  return cached.client;
}

/**
 * 走り書きメモ（+ 任意で画像）から記録カードの下書きを作る。
 *
 * `images` には**元のバイト列**をそのまま渡してよい。送信前の縮小（長辺 768px + WebP）は
 * ここで必ず行うので、呼び出し側が掲載用の 1200px を誤って送る経路を作らない。
 */
export async function generateRecordDraft({
  note,
  images = [],
}: {
  note: string;
  images?: Buffer[];
}): Promise<RecordDraft> {
  const client = getClient();

  // 通信量の節約（要件 §9）。掲載用より小さい AI_MAX_EDGE を使う。
  const parts = await Promise.all(
    images.map(async (image) => ({
      inlineData: {
        data: (await processImage(image, { maxEdge: AI_MAX_EDGE })).toString(
          "base64",
        ),
        mimeType: PROCESSED_CONTENT_TYPE,
      },
    })),
  );

  let text: string | undefined;
  try {
    const response = await client.models.generateContent({
      model: geminiModel(),
      contents: [
        {
          role: "user",
          parts: [...parts, { text: `先生の走り書きメモ:\n${note}` }],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: DRAFT_SCHEMA,
        httpOptions: { timeout: REQUEST_TIMEOUT_MS },
        // thinkingConfig はあえて指定しない。指定の仕方が世代で変わっており
        // （3.x は thinkingLevel / 2.5 は thinkingBudget）、GEMINI_MODEL を
        // 差し替えた瞬間に 400 になりうる。既定に任せる。
      },
    });
    text = response.text;
  } catch (cause) {
    throw toDraftError(cause);
  }

  return parseDraft(text);
}

function parseDraft(text: string | undefined): RecordDraft {
  // 安全性フィルタで止まった場合などは text が空で返る。
  if (!text?.trim()) throw new GeminiDraftError(MESSAGES.unreadable);

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (cause) {
    console.error("[gemini] JSON として読めない応答:", text);
    throw new GeminiDraftError(MESSAGES.unreadable, { cause });
  }

  const parsed = draftResultSchema.safeParse(json);
  if (!parsed.success) {
    console.error("[gemini] 想定と違う形の応答:", json);
    throw new GeminiDraftError(MESSAGES.unreadable);
  }
  return parsed.data;
}

/**
 * SDK の例外を利用者向けの文言へ翻訳する。
 *
 * **エラークラス名では判定しない。** `@google/genai` は世代によって例外クラスの構成が
 * 変わっている（ApiError / APIConnectionTimeoutError 等）ため、どの世代でも共通して
 * 残る `status`（HTTP ステータス）と name/message のタイムアウト痕跡だけを見る。
 */
function toDraftError(cause: unknown): GeminiDraftError {
  if (cause instanceof GeminiDraftError) return cause;

  console.error("[gemini] 下書きの生成に失敗しました:", cause);

  const status = statusOf(cause);
  if (status === 429) return new GeminiDraftError(MESSAGES.rateLimited, { cause });
  if (status === 400 || status === 401 || status === 403) {
    return new GeminiDraftError(MESSAGES.auth, { cause });
  }
  if (status === 404) return new GeminiDraftError(MESSAGES.model, { cause });
  if (status && status >= 500) {
    return new GeminiDraftError(MESSAGES.server, { cause });
  }

  if (isTimeout(cause)) return new GeminiDraftError(MESSAGES.timeout, { cause });

  return new GeminiDraftError(MESSAGES.unknown, { cause });
}

function statusOf(cause: unknown): number | undefined {
  const status = (cause as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

function isTimeout(cause: unknown): boolean {
  const error = cause as { name?: unknown; message?: unknown } | null;
  const name = typeof error?.name === "string" ? error.name : "";
  const message = typeof error?.message === "string" ? error.message : "";
  return (
    name === "AbortError" ||
    name === "TimeoutError" ||
    /timed?\s*out|timeout|fetch failed|network/i.test(message)
  );
}
