"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError } from "@/lib/api";
import { MIN_DURATIONS } from "@/lib/meetings";

interface MeetingFormProps {
  initialName: string;
  initialMinDuration: number;
  submitLabel: string;
  // false 를 돌려주면 제출을 취소한 것으로 보고 버튼을 다시 연다
  onSubmit: (name: string, minDuration: number) => Promise<boolean | void>;
}

export default function MeetingForm({
  initialName,
  initialMinDuration,
  submitLabel,
  onSubmit,
}: MeetingFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [minDuration, setMinDuration] = useState(initialMinDuration);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("모임 이름을 입력해 주세요.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const done = await onSubmit(trimmed, minDuration);
      if (done === false) setSubmitting(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setError(e instanceof ApiError ? e.message : "요청에 실패했어요.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="meeting-name" className="text-sm font-medium">
          모임 이름
        </label>
        <input
          id="meeting-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="meeting-duration" className="text-sm font-medium">
          최소 회의시간
        </label>
        <select
          id="meeting-duration"
          value={minDuration}
          onChange={(e) => setMinDuration(Number(e.target.value))}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
        >
          {MIN_DURATIONS.map((m) => (
            <option key={m} value={m}>
              {m}분
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
