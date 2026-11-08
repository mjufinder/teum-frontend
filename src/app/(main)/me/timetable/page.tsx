"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import TimetableEditor from "@/components/timetable/TimetableEditor";
import TimetableUpload from "@/components/timetable/TimetableUpload";
import { ApiError } from "@/lib/api";
import { getMyTimetable } from "@/lib/timetable-api";
import type { RecognizedTimetable, TimetableBits } from "@/types/timetable";

export default function MyTimetablePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [bits, setBits] = useState<TimetableBits | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  // 인식 결과가 들어오면 편집기 상태를 새로 시작한다.
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    getMyTimetable()
      .then((timetable) => {
        setBits(timetable);
        setLoading(false);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/login");
          return;
        }
        setError(e instanceof ApiError ? e.message : "시간표를 불러오지 못했어요.");
        setLoading(false);
      });
  }, [router]);

  function handleReupload() {
    const ok = confirm(
      "수업 시간만 인식 결과로 바꾸고 개인 일정은 그대로 둬요. 저장해야 반영돼요. 계속할까요?"
    );
    if (ok) setUploading(true);
  }

  function handleRecognized(result: RecognizedTimetable) {
    setBits((prev) =>
      prev ? { class_bits: result.class_bits, manual_bits: prev.manual_bits } : prev
    );
    setWarnings(result.warnings);
    setEditorKey((key) => key + 1);
    setUploading(false);
  }

  function renderContent() {
    if (loading) return <p className="text-sm text-muted">불러오는 중...</p>;
    if (error) return <p className="text-sm text-danger">{error}</p>;
    if (!bits) {
      return (
        <p className="text-sm text-muted">
          아직 등록한 시간표가 없어요.{" "}
          <Link href="/onboarding/timetable" className="text-brand underline">
            시간표 등록하기
          </Link>
        </p>
      );
    }
    return (
      <>
        {uploading ? (
          <TimetableUpload
            onRecognized={handleRecognized}
            onManual={() => setUploading(false)}
            onCancel={() => setUploading(false)}
          />
        ) : (
          <div>
            <button
              type="button"
              onClick={handleReupload}
              className="rounded-md border border-line bg-surface px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
            >
              이미지로 다시 등록
            </button>
          </div>
        )}
        <TimetableEditor key={editorKey} initial={bits} warnings={warnings} />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">내 시간표</h1>
      {renderContent()}
    </div>
  );
}
