// ⚠️ 移行期間だけの足場（チケット24）。
//
// 24 で共通シェルを v2（ダーク）にしたが、未刷新のフェーズ1画面は v1 の
// 白カード・ink 文字のままなので、そのまま乗せると読めない。
// そこで v1 画面だけをこの白い面で包み、可読性を保つ。
//
// **25〜27 で画面を v2 化するたびに外し、28 で残骸がゼロであることを確認する。**
// このファイルへの import が無くなったら、ファイルごと削除してよい（grep の目印）。
//
// v1 トークン（bg-canvas / text-ink / border-hairline / font-sans）を意図的に使っている。
// このコンポーネント自体が新旧の橋渡しなので、ここだけは混在してよい。
//
// パディングは**刷新前の共通シェルと同じ `px-4 py-6 md:px-8`** にしてある。
// 集計のヒーローが `-mx-4 -mt-6 md:-mx-8` でフルブリードしているため、
// 値がずれると面からはみ出す。`overflow-hidden` はそのヒーローを角丸に沿わせるためで、
// v1 画面に position: sticky を使っている箇所が無いことを確認して付けている
// （祖先の overflow は sticky を黙って壊す）。
export function LegacyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-20 border border-hairline bg-canvas px-4 py-6 font-sans text-ink shadow-elev-2 md:px-8">
      {children}
    </div>
  );
}
