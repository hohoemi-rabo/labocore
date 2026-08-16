"use client";

import { useCallback } from "react";
import { Toast, useToast } from "@/components/v2/toast";
import { NextLessonCard, type NextLessonClass } from "./next-lesson-card";

// トーストはこの一段上で1つだけ持つ。カードごとに持つと、
// position: fixed の通知が同じ位置に重なってしまう。
export function NextLessonList({
  classes,
  today,
}: {
  classes: NextLessonClass[];
  today: string;
}) {
  const { message, showToast } = useToast();

  // カード側の useEffect の依存に入るので、毎レンダー作り直さない。
  const handleSaved = useCallback(
    () => showToast("保存しました"),
    [showToast],
  );
  const handleError = useCallback(
    (msg: string) => showToast(msg),
    [showToast],
  );

  return (
    <div className="flex flex-col gap-4">
      {classes.map((cls) => (
        // key はコマの id 固定。可変の値を混ぜると再マウントして入力中の内容が飛ぶ。
        <NextLessonCard
          key={cls.id}
          cls={cls}
          today={today}
          onSaved={handleSaved}
          onError={handleError}
        />
      ))}
      <Toast message={message} />
    </div>
  );
}
