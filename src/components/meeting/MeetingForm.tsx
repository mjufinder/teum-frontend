"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError } from "@/lib/api";
import {
  MIN_DURATIONS,
  SEARCH_TIMES,
  TRAVEL_BUFFERS,
  toMinutes,
} from "@/lib/meetings";

export interface MeetingFormValues {
  name: string;
  description: string;
  minDuration: number;
  searchStartTime: string;
  searchEndTime: string;
  travelBufferMin: number;
}

interface MeetingFormProps {
  initial: MeetingFormValues;
  submitLabel: string;
  // false 를 돌려주면 제출을 취소한 것으로 보고 버튼을 다시 연다
  onSubmit: (values: MeetingFormValues) => Promise<boolean | void>;
}

const inputClass = "input";

function validate(values: MeetingFormValues) {
  if (!values.name.trim()) return "모임 이름을 입력해 주세요.";
  const start = toMinutes(values.searchStartTime);
  const end = toMinutes(values.searchEndTime);
  if (start >= end) return "탐색 종료 시각은 시작 시각보다 늦어야 해요.";
  if (end - start < values.minDuration) {
    return "탐색 시간대가 최소 회의시간보다 짧아요.";
  }
  return null;
}

export default function MeetingForm({
  initial,
  submitLabel,
  onSubmit,
}: MeetingFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof MeetingFormValues>(
    key: K,
    value: MeetingFormValues[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = validate(values);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const done = await onSubmit({
        ...values,
        name: values.name.trim(),
        description: values.description.trim(),
      });
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
      className="card flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="meeting-name" className="text-sm font-bold">
          모임 이름
        </label>
        <input
          id="meeting-name"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          maxLength={30}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="meeting-description" className="text-sm font-bold">
          설명 <span className="font-normal text-muted">(선택)</span>
        </label>
        <textarea
          id="meeting-description"
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="예: 주간 진행 상황 공유"
          className={`${inputClass} resize-none`}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="meeting-duration" className="text-sm font-bold">
          최소 회의시간
        </label>
        <select
          id="meeting-duration"
          value={values.minDuration}
          onChange={(e) => update("minDuration", Number(e.target.value))}
          className={inputClass}
        >
          {MIN_DURATIONS.map((m) => (
            <option key={m} value={m}>
              {m}분
            </option>
          ))}
        </select>
      </div>

      <details className="disclosure rounded-[8px] border-[1.5px] border-line-strong px-4 py-3">
        <summary>
          <span>
            세부 조건 <span className="font-normal text-muted">(선택, 눌러서 펼치기)</span>
          </span>
        </summary>
        <div className="mt-3 flex flex-col gap-4 pb-1">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">탐색 시간대</span>
            <div className="flex items-center gap-2">
              <select
                aria-label="탐색 시작 시각"
                value={values.searchStartTime}
                onChange={(e) => update("searchStartTime", e.target.value)}
                className={inputClass}
              >
                {SEARCH_TIMES.slice(0, -1).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <span className="text-sm text-muted">~</span>
              <select
                aria-label="탐색 종료 시각"
                value={values.searchEndTime}
                onChange={(e) => update("searchEndTime", e.target.value)}
                className={inputClass}
              >
                {SEARCH_TIMES.slice(1).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted">이 시간대 안에서만 회의 후보를 찾아요.</p>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="meeting-buffer" className="text-sm font-bold">
              이동 여유시간
            </label>
            <select
              id="meeting-buffer"
              value={values.travelBufferMin}
              onChange={(e) => update("travelBufferMin", Number(e.target.value))}
              className={inputClass}
            >
              {TRAVEL_BUFFERS.map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? "없음" : `${m}분`}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted">
              수업 앞뒤로 이만큼 비워 두고 후보를 찾아요.
            </p>
          </div>
        </div>
      </details>

      {error && <p className="text-sm text-danger">{error}</p>}
      <div>
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
