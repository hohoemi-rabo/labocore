import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StudentForm } from "../../student-form";
import { NoClassesNotice } from "../../no-classes-notice";
import { updateStudent, deactivateStudent } from "../../actions";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: student }, { data: activeClasses }] = await Promise.all([
    supabase.from("students").select("*").eq("id", id).single(),
    supabase
      .from("classes")
      .select("id, name")
      .eq("is_active", true)
      .order("weekday")
      .order("start_time"),
  ]);

  if (!student) notFound();

  // 生徒の所属コマが廃止済みで active 一覧に無い場合は温存する
  // （選択肢に無いと保存時に別コマへ付け替わってしまうため）。
  const classOptions = [...(activeClasses ?? [])];
  if (
    student.class_id &&
    !classOptions.some((c) => c.id === student.class_id)
  ) {
    const { data: ownClass } = await supabase
      .from("classes")
      .select("id, name")
      .eq("id", student.class_id)
      .single();
    if (ownClass) {
      classOptions.unshift({ id: ownClass.id, name: `${ownClass.name}（廃止済み）` });
    }
  }

  return (
    <div className="flex max-w-[560px] flex-col gap-6">
      <Link href="/settings/students" className="text-[14px] text-ink-muted-48">
        ‹ 生徒管理
      </Link>

      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[34px]">
        生徒を編集
      </h1>

      {classOptions.length === 0 ? (
        <NoClassesNotice />
      ) : (
        <StudentForm
          action={updateStudent}
          submitLabel="保存する"
          classOptions={classOptions}
          defaultValues={{
            id: student.id,
            name: student.name,
            kana: student.kana,
            class_id: student.class_id,
            unit_price: student.unit_price,
            phone: student.phone,
            email: student.email,
            address: student.address,
            birth_date: student.birth_date,
            smartphone_os: student.smartphone_os,
            emergency_contact_name: student.emergency_contact_name,
            emergency_contact_relation: student.emergency_contact_relation,
            emergency_contact_phone: student.emergency_contact_phone,
            note: student.note,
          }}
        />
      )}

      <div className="mt-6 flex flex-col gap-3 border-t border-divider-soft pt-6">
        <p className="text-[14px] text-ink-muted-48">
          退会にすると一覧から外れます。過去の出欠・請求の履歴は残ります。
        </p>
        <ConfirmDialog
          triggerLabel="この生徒を退会にする"
          title="退会にしますか？"
          message={`「${student.name}」を退会にします。過去の記録は保持されますが、一覧には表示されなくなります。`}
          confirmLabel="退会にする"
          action={deactivateStudent}
          hidden={{ id: student.id }}
        />
      </div>
    </div>
  );
}
