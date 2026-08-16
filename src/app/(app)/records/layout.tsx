// Server Action の POST はそのルートの関数で動くため、写真アップロードを含む
// /records/new と /records/[id]/edit の両方に効かせるにはここに置くのが確実。
// Fluid Compute が有効なら既定 300s なので不要だが、無効な場合の既定 10s では
// 画像2枚（sharp の変換 + R2 への往復）が超えうるため保険として指定する。
export const maxDuration = 60;

export default function RecordsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
