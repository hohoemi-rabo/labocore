import { formatDateWithWeekday } from "@/lib/format";
import { cardClass, datePillClass, eyebrowPromptClass } from "@/components/v2/styles";
import { CopyPromptButton } from "./copy-prompt-button";

// 記録カード1枚（DESIGN_v2 §7）。日付ピル → テーマ → メモ → 写真 → プロンプト。
//
// hover の浮き上がりは意図的に付けていない。Tailwind 3.4 は hoverOnlyWhenSupported が
// 既定オフで、タップすると hover が発火して貼り付いてしまう。記録カードは押せる要素では
// ないので、動かすのはタブ・コピーボタン・フッターだけにする（DESIGN_v2 §6）。

export type KirokuRecord = {
  id: string;
  lessonDate: string;
  theme: string;
  memo: string;
  prompt: string | null;
  imageUrls: string[];
};

export function RecordCard({ record }: { record: KirokuRecord }) {
  // image_urls は text[] に cardinality<=2 の CHECK しかなく、形式の保証がない。
  // 描画前に濾しておく（data: や javascript: を素通ししない）。
  const photos = record.imageUrls.filter(
    (u) => typeof u === "string" && u.startsWith("https://"),
  );
  const prompt = record.prompt?.trim();

  return (
    <article className={`${cardClass} px-5 py-5`}>
      <span className={datePillClass}>
        {formatDateWithWeekday(record.lessonDate)}
      </span>

      <h3 className="mt-3 text-[21px] font-black leading-[1.55]">
        {record.theme}
      </h3>

      {/* 管理画面の textarea 由来なので改行が入る。pre-wrap にしないと段落が消える。 */}
      <p className="mt-2 whitespace-pre-wrap text-[17px] leading-jp text-fg-body">
        {record.memo}
      </p>

      {photos.length > 0 && (
        // 枚数によらず縦積み。375px で2列にすると1枚150px 程度になり、
        // 横長のスクリーンショットに写った文字が読めなくなる。
        <div className="mt-4 flex flex-col gap-3">
          {photos.map((src, i) => (
            <div
              key={src}
              className="overflow-hidden rounded-14 border border-line bg-white shadow-elev-1"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- 変換済みなので next/image は使わない（チケット15） */}
              <img
                src={src}
                alt={
                  photos.length > 1
                    ? `授業の画面の写真（${i + 1}枚目）`
                    : "授業の画面の写真"
                }
                loading="lazy"
                decoding="async"
                className="block h-auto w-full"
              />
            </div>
          ))}
        </div>
      )}

      {prompt && (
        <div className="mt-4 rounded-16 border border-prompt-line bg-prompt-panel px-4 py-4">
          <p className={eyebrowPromptClass}>
            Prompt / この日AIにお願いした言葉
          </p>
          {/* ⚠️ font-jp が必須。Tailwind の preflight が pre に fontFamily.mono を当てるため、
              指定しないと日本語が Courier 系のフォールバックで崩れる。
              break-words は 375px で長い URL が溢れないように。 */}
          <pre className="mt-2 whitespace-pre-wrap break-words rounded-12 border border-prompt-pre-line bg-sunken px-3 py-3 font-jp text-[17px] leading-jp text-prompt-pre shadow-well">
            {prompt}
          </pre>
          <CopyPromptButton text={prompt} />
        </div>
      )}
    </article>
  );
}
