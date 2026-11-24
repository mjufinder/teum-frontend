"use client";

import { ChevronDown, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  showSummary?: boolean;
  draftKey?: string;
  // false 를 돌려주면 제출을 취소한 것으로 보고 버튼을 다시 연다
  onSubmit: (values: MeetingFormValues) => Promise<boolean | void>;
}

const fieldClass =
  "h-10 w-full rounded-[8px] border border-ink-line-2 bg-ink-base px-3 text-sm text-ink-text placeholder:text-ink-text-weak transition-colors focus:border-neon focus:outline-none";

const DAY_START_MIN = 9 * 60;
const DAY_SPAN_MIN = 13 * 60;

function validateTimeRange(values: MeetingFormValues) {
  const start = toMinutes(values.searchStartTime);
  const end = toMinutes(values.searchEndTime);
  if (start >= end) return "탐색 종료 시각은 시작 시각보다 늦어야 해요.";
  if (end - start < values.minDuration) {
    return "탐색 시간대가 최소 회의시간보다 짧아요.";
  }
  return null;
}

function validate(values: MeetingFormValues) {
  if (!values.name.trim()) return "모임 이름을 입력해 주세요.";
  return validateTimeRange(values);
}

export default function MeetingForm({
  initial,
  submitLabel,
  showSummary = false,
  draftKey,
  onSubmit,
}: MeetingFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [touchedName, setTouchedName] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!draftKey) return;
    Promise.resolve().then(() => {
      try {
        const raw = localStorage.getItem(draftKey);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<MeetingFormValues>;
        if (parsed && typeof parsed.name === "string") {
          setValues((prev) => ({ ...prev, ...parsed }));
          setHasDraft(true);
        }
      } catch {
        /* 무시 */
      }
    });
  }, [draftKey]);

  function persistDraft(next: MeetingFormValues) {
    if (!draftKey) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(next));
      setHasDraft(true);
    } catch {
      /* 무시 */
    }
  }

  function clearDraft() {
    if (!draftKey) return;
    try {
      localStorage.removeItem(draftKey);
      setHasDraft(false);
    } catch {
      /* 무시 */
    }
  }

  function update<K extends keyof MeetingFormValues>(
    key: K,
    value: MeetingFormValues[K]
  ) {
    setSubmitError(null);
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      persistDraft(next);
      return next;
    });
  }

  function handleReset() {
    setValues(initial);
    setTouchedName(false);
    setSubmitError(null);
    clearDraft();
  }

  const timeError = validateTimeRange(values);
  const fullError = validate(values);
  const inlineError =
    timeError ?? (touchedName && !values.name.trim() ? "모임 이름을 입력해 주세요." : null);

  async function submitForm() {
    setTouchedName(true);
    const message = validate(values);
    if (message) {
      setSubmitError(message);
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const done = await onSubmit({
        ...values,
        name: values.name.trim(),
        description: values.description.trim(),
      });
      if (done === false) {
        setSubmitting(false);
      } else {
        clearDraft();
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setSubmitError(e instanceof ApiError ? e.message : "요청에 실패했어요.");
      setSubmitting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitForm();
  }

  const startPct = Math.max(
    0,
    Math.min(100, ((toMinutes(values.searchStartTime) - DAY_START_MIN) / DAY_SPAN_MIN) * 100)
  );
  const endPct = Math.max(
    startPct,
    Math.min(100, ((toMinutes(values.searchEndTime) - DAY_START_MIN) / DAY_SPAN_MIN) * 100)
  );

  const formEl = (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !submitting) {
          e.preventDefault();
          submitForm();
        }
      }}
      className="flex flex-col gap-6 rounded-[12px] border border-ink-line bg-ink-1 p-6"
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="meeting-name" className="text-sm font-semibold text-ink-text">
            모임 이름
          </label>
          <div className="flex items-center gap-3">
            {hasDraft && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-text-weak transition-colors hover:text-ink-text"
              >
                <RotateCcw className="size-3" />
                초기화
              </button>
            )}
            <span className="text-xs text-ink-text-weak tabular-nums">
              {values.name.length}/30
            </span>
          </div>
        </div>
        <input
          id="meeting-name"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          onBlur={() => setTouchedName(true)}
          maxLength={30}
          placeholder="예: 캡스톤 디자인 정기 회의"
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="meeting-description" className="text-sm font-semibold text-ink-text">
            설명 <span className="font-normal text-ink-text-3">(선택)</span>
          </label>
          <span className="text-xs text-ink-text-weak tabular-nums">
            {values.description.length}/200
          </span>
        </div>
        <textarea
          id="meeting-description"
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="예: 주간 진행 상황 공유"
          className={`${fieldClass} h-auto resize-none py-2.5`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-ink-text">최소 회의시간</span>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {MIN_DURATIONS.map((m) => {
            const active = values.minDuration === m;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={active}
                onClick={() => update("minDuration", m)}
                className={`h-9 rounded-[8px] border text-xs font-semibold transition-colors ${
                  active
                    ? "border-neon bg-neon/12 text-neon"
                    : "border-ink-line bg-ink-base text-ink-text-3 hover:border-ink-line-2 hover:text-ink-text"
                }`}
              >
                {m}분
              </button>
            );
          })}
        </div>
      </div>

      <details className="group rounded-[10px] border border-ink-line bg-ink-base px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink-text [&::-webkit-details-marker]:hidden">
          <span>
            세부 조건{" "}
            <span className="text-xs font-normal text-ink-text-3">
              ({values.searchStartTime}–{values.searchEndTime} · 여유{" "}
              {values.travelBufferMin === 0 ? "없음" : `${values.travelBufferMin}분`})
            </span>
          </span>
          <ChevronDown className="size-4 text-ink-text-3 transition-transform group-open:rotate-180" />
        </summary>

        <div className="mt-4 flex flex-col gap-5 border-t border-ink-line pt-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-ink-text-2">탐색 시간대</span>
            <div className="flex items-center gap-2">
              <select
                aria-label="탐색 시작 시각"
                value={values.searchStartTime}
                onChange={(e) => update("searchStartTime", e.target.value)}
                className={fieldClass}
              >
                {SEARCH_TIMES.slice(0, -1).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <span className="text-xs text-ink-text-3">~</span>
              <select
                aria-label="탐색 종료 시각"
                value={values.searchEndTime}
                onChange={(e) => update("searchEndTime", e.target.value)}
                className={fieldClass}
              >
                {SEARCH_TIMES.slice(1).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-ink-text-weak tabular-nums">09:00</span>
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-ink-3">
                <div
                  className={`absolute inset-y-0 rounded-full transition-all duration-200 ${
                    timeError ? "bg-live" : "bg-neon"
                  }`}
                  style={{ left: `${startPct}%`, width: `${Math.max(2, endPct - startPct)}%` }}
                />
              </div>
              <span className="text-[10px] text-ink-text-weak tabular-nums">22:00</span>
            </div>
            <p className="text-xs text-ink-text-3">
              이 시간대 안에서만 회의 후보를 찾아요.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-text-2">이동 여유시간</span>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {TRAVEL_BUFFERS.map((m) => {
                const active = values.travelBufferMin === m;
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={active}
                    onClick={() => update("travelBufferMin", m)}
                    className={`h-9 rounded-[8px] border text-xs font-semibold transition-colors ${
                      active
                        ? "border-neon bg-neon/12 text-neon"
                        : "border-ink-line bg-ink-1 text-ink-text-3 hover:border-ink-line-2 hover:text-ink-text"
                    }`}
                  >
                    {m === 0 ? "없음" : `${m}분`}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-ink-text-3">
              수업 앞뒤로 이만큼 비워 두고 후보를 찾아요.
            </p>
          </div>
        </div>
      </details>

      {(submitError || inlineError) && (
        <p className="rounded-[8px] border border-live/30 bg-live/5 px-3.5 py-2.5 text-xs font-medium text-live">
          {submitError ?? inlineError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-line pt-4">
        <span className="hidden text-[11px] text-ink-text-weak sm:inline">
          Cmd/Ctrl + Enter로 바로 저장
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-9 items-center justify-center rounded-[8px] border border-ink-line-2 px-4 text-sm font-semibold text-ink-text-2 transition-colors hover:bg-ink-2"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting || Boolean(fullError)}
            className="inline-flex h-9 items-center justify-center rounded-[8px] bg-neon px-5 text-sm font-bold text-on-neon transition-colors hover:bg-neon-2 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting ? "처리 중..." : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );

  if (!showSummary) return formEl;

  return (
    <div className="pb-16 sm:pb-0">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        {formEl}

        <aside className="flex flex-col gap-3 rounded-[12px] border border-ink-line bg-ink-1 p-5 lg:sticky lg:top-24">
          <div className="flex items-center justify-between border-b border-ink-line pb-3">
            <span className="text-xs font-bold text-ink-text-3">조건 요약</span>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                timeError ? "text-live" : "text-neon"
              }`}
            >
              <span
                aria-hidden
                className={`size-1.5 rounded-full ${timeError ? "bg-live" : "bg-neon"}`}
              />
              {timeError ? "범위 확인 필요" : "탐색 가능"}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <p className="truncate text-sm font-bold text-ink-text">
              {values.name.trim() || "모임 이름 미입력"}
            </p>
            <p className="line-clamp-2 text-xs text-ink-text-3">
              {values.description.trim() || "설명 없음"}
            </p>
          </div>

          <dl className="flex flex-col gap-2 border-t border-ink-line pt-3 text-xs">
            <div className="flex items-center justify-between">
              <dt className="text-ink-text-3">최소 회의시간</dt>
              <dd className="font-semibold text-ink-text tabular-nums">{values.minDuration}분</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-text-3">탐색 시간대</dt>
              <dd className="font-semibold text-ink-text tabular-nums">
                {values.searchStartTime}–{values.searchEndTime}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-text-3">이동 여유시간</dt>
              <dd className="font-semibold text-ink-text tabular-nums">
                {values.travelBufferMin === 0 ? "없음" : `${values.travelBufferMin}분`}
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      {/* 모바일 하단 고정 제출 바 */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-ink-line bg-ink-base/90 px-5 py-3 backdrop-blur-md sm:hidden">
        <div className="flex flex-col text-xs">
          <span className="font-bold text-ink-text tabular-nums">
            {values.minDuration}분 · {values.searchStartTime}–{values.searchEndTime}
          </span>
          <span className="text-[11px] text-ink-text-3">
            {values.travelBufferMin === 0 ? "여유시간 없음" : `여유 ${values.travelBufferMin}분`}
          </span>
        </div>
        <button
          type="button"
          disabled={submitting || Boolean(fullError)}
          onClick={submitForm}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-[8px] bg-neon px-5 text-sm font-bold text-on-neon transition-colors hover:bg-neon-2 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {submitting ? "처리 중..." : submitLabel}
        </button>
      </div>
    </div>
  );
}
