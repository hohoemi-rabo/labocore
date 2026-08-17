"use client";

import { useRef, useState } from "react";
import { shrinkImageInBrowser } from "@/lib/image-client";
import { labelClass, errorClass } from "@/components/v2/form";
import { MAX_PHOTOS } from "@/lib/records";

// Vercel のリクエストボディ上限は 4.5MB で、超過は Server Action に到達する前に 413 になる。
// = サーバー側では捕捉できず、利用者には「押しても何も起きない」ように見える。
// shrinkImageInBrowser は縮小に失敗すると元ファイルをそのまま返す仕様なので
// （PC 上の HEIC など）、送る前にここで必ず合計サイズを見る。
const MAX_TOTAL_BYTES = 3_500_000;

export type PickedPhoto = { id: string; file: File; preview: string };

/** 写真の状態は親（RecordForm）が持つ。FormData に詰めるのが親の役目のため。 */
export type PhotoPickerProps = {
  keptUrls: string[];
  onKeptUrlsChange: (urls: string[]) => void;
  picked: PickedPhoto[];
  onPickedChange: (picked: PickedPhoto[]) => void;
  /** 縮小中・サイズ超過のあいだ送信させないため、親へ状態を返す */
  onBlockingChange: (blocking: boolean) => void;
};

export function PhotoPicker({
  keptUrls,
  onKeptUrlsChange,
  picked,
  onPickedChange,
  onBlockingChange,
}: PhotoPickerProps) {
  const [shrinking, setShrinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const total = keptUrls.length + picked.length;
  const totalBytes = picked.reduce((sum, p) => sum + p.file.size, 0);
  const tooLarge = totalBytes > MAX_TOTAL_BYTES;

  function setShrinkingAndReport(next: boolean, oversized = tooLarge) {
    setShrinking(next);
    onBlockingChange(next || oversized);
  }

  async function handleSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    // 同じファイルを選び直せるように毎回クリアする。
    event.target.value = "";
    if (files.length === 0) return;

    const room = MAX_PHOTOS - total;
    if (room <= 0) {
      setError(`写真は${MAX_PHOTOS}枚までです`);
      return;
    }

    setError(null);
    setShrinkingAndReport(true);
    try {
      const added: PickedPhoto[] = [];
      for (const file of files.slice(0, room)) {
        const shrunk = await shrinkImageInBrowser(file);
        added.push({
          id: `${file.name}-${file.lastModified}-${added.length}`,
          file: shrunk,
          preview: await readAsDataUrl(shrunk),
        });
      }
      const next = [...picked, ...added];
      onPickedChange(next);

      const nextBytes = next.reduce((sum, p) => sum + p.file.size, 0);
      setShrinkingAndReport(false, nextBytes > MAX_TOTAL_BYTES);

      if (files.length > room) {
        setError(`写真は${MAX_PHOTOS}枚までです（超えた分は追加していません）`);
      }
    } catch {
      setError("写真を読み込めませんでした。JPEG か PNG でお試しください。");
      setShrinkingAndReport(false);
    }
  }

  function removePicked(id: string) {
    const next = picked.filter((p) => p.id !== id);
    onPickedChange(next);
    const nextBytes = next.reduce((sum, p) => sum + p.file.size, 0);
    onBlockingChange(shrinking || nextBytes > MAX_TOTAL_BYTES);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className={labelClass}>写真（最大{MAX_PHOTOS}枚・任意）</span>

      {/* 残す既存写真を Server Action へ渡す。DOM 順がそのまま image_urls の順になる。 */}
      {keptUrls.map((url) => (
        <input key={url} type="hidden" name="existing_image_urls" value={url} />
      ))}

      {total > 0 && (
        <ul className="flex flex-wrap gap-3">
          {keptUrls.map((url) => (
            <PhotoTile
              key={url}
              src={url}
              caption="保存済み"
              onRemove={() =>
                onKeptUrlsChange(keptUrls.filter((u) => u !== url))
              }
            />
          ))}
          {picked.map((p) => (
            <PhotoTile
              key={p.id}
              src={p.preview}
              caption={`${Math.round(p.file.size / 1024)} KB`}
              onRemove={() => removePicked(p.id)}
            />
          ))}
        </ul>
      )}

      {total < MAX_PHOTOS && (
        <div>
          <input
            ref={inputRef}
            type="file"
            // name を付けない。付けると FormData に原寸ファイルが入り、縮小前のものを
            // 送ってしまう経路ができる（親が縮小済みの File だけを詰める）。
            // accept に image/heic を入れないこと。入れると Safari が変換せず HEIC のまま渡してくる。
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleSelect}
            className="hidden"
          />
          <button
            type="button"
            disabled={shrinking}
            onClick={() => inputRef.current?.click()}
            className="flex min-h-[44px] items-center justify-center rounded-16 border border-dashed border-line px-5 text-[17px] font-bold text-sub transition active:scale-95 disabled:opacity-60"
          >
            {shrinking ? "読み込み中…" : "＋ 写真を追加"}
          </button>
        </div>
      )}

      {tooLarge && (
        <p className={errorClass}>
          写真が大きすぎます（合計{" "}
          {Math.round((totalBytes / 1024 / 1024) * 10) / 10}MB）。
          枚数を減らすか、JPEG で撮り直したものをお使いください。
        </p>
      )}
      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
}

function PhotoTile({
  src,
  caption,
  onRemove,
}: {
  src: string;
  caption: string;
  onRemove: () => void;
}) {
  return (
    <li className="w-[140px] overflow-hidden rounded-14 border border-line bg-white shadow-elev-1">
      {/* eslint-disable-next-line @next/next/no-img-element -- 変換済みなので next/image は使わない（チケット15） */}
      <img
        src={src}
        alt=""
        width={140}
        height={100}
        className="block h-[100px] w-full object-cover"
      />
      <div className="flex items-center justify-between gap-1 border-t border-line bg-surface px-2 py-1">
        <span className="truncate text-[13px] tabular-nums text-sub">
          {caption}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label="この写真を外す"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-12 text-[17px] text-off transition active:scale-95"
        >
          ×
        </button>
      </div>
    </li>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
