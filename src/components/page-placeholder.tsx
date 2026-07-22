// 各画面の中身を実装するまでの共通プレースホルダ（05〜11 で順次置き換える）。
export function PagePlaceholder({
  title,
  note = "この画面は準備中です。",
}: {
  title: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[34px]">
        {title}
      </h1>
      <p className="text-ink-muted-48">{note}</p>
    </div>
  );
}
