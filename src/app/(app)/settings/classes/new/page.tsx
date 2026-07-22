import Link from "next/link";
import { ClassForm } from "../class-form";
import { createClass } from "../actions";

export default function NewClassPage() {
  return (
    <div className="flex max-w-[520px] flex-col gap-6">
      <Link href="/settings/classes" className="text-[14px] text-ink-muted-48">
        ‹ コマ管理
      </Link>

      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[34px]">
        コマを追加
      </h1>

      <ClassForm action={createClass} submitLabel="追加する" />
    </div>
  );
}
