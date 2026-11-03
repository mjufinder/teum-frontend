"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import TimetableGrid from "@/components/timetable/TimetableGrid";
import { ApiError } from "@/lib/api";
import { paintCells } from "@/lib/timetable";
import { saveMyTimetable } from "@/lib/timetable-api";
import type { SlotState, TimetableBits } from "@/types/timetable";

const tools: { state: SlotState; label: string }[] = [
  { state: "class", label: "수업" },
  { state: "manual", label: "개인 일정" },
  { state: "free", label: "지우기" },
];

interface TimetableEditorProps {
  initial: TimetableBits;
  warnings?: string[];
  onSaved?: () => void;
}

export default function TimetableEditor({
  initial,
  warnings = [],
  onSaved,
}: TimetableEditorProps) {
  const router = useRouter();
  const [bits, setBits] = useState(initial);
  const [tool, setTool] = useState<SlotState>("class");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePaint(cells: number[]) {
    setBits((prev) => paintCells(prev, cells, tool));
    setSaved(false);
  }

  async function handleSave() {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await saveMyTimetable(bits.class_bits, bits.manual_bits);
      setSaved(true);
      onSaved?.();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setError(e instanceof ApiError ? e.message : "저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        이미지 인식은 월~금만 돼요. 저장 전에 토·일 칸을 확인해 주세요.
      </p>

      {warnings.map((warning, i) => (
        <p key={i} className="text-sm text-muted">
          {warning}
        </p>
      ))}

      <div className="flex gap-2">
        {tools.map((item) => (
          <button
            key={item.state}
            type="button"
            aria-pressed={tool === item.state}
            onClick={() => setTool(item.state)}
            className={`rounded-md border px-4 py-2 text-sm ${
              tool === item.state
                ? "border-brand bg-brand-soft text-brand"
                : "border-line bg-surface hover:bg-zinc-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <TimetableGrid bits={bits} onPaint={handlePaint} />

      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-muted">저장했어요.</p>}

      <div>
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
