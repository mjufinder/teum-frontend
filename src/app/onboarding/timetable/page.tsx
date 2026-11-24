"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import TimetableEditor from "@/components/timetable/TimetableEditor";
import TimetableUpload from "@/components/timetable/TimetableUpload";
import { ApiError } from "@/lib/api";
import { withPendingInvite } from "@/lib/invites";
import { emptyBits } from "@/lib/timetable";
import { getMyTimetable } from "@/lib/timetable-api";
import type { RecognizedTimetable, TimetableBits } from "@/types/timetable";

export default function OnboardingTimetablePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [bits, setBits] = useState<TimetableBits | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

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

  function startManual() {
    setBits({ class_bits: emptyBits(), manual_bits: emptyBits() });
  }

  function handleRecognized(result: RecognizedTimetable) {
    setBits({ class_bits: result.class_bits, manual_bits: result.manual_bits });
    setWarnings(result.warnings);
  }

  function renderContent() {
    if (loading) return <p className="text-sm text-muted">불러오는 중...</p>;
    if (error) return <p className="text-sm text-danger">{error}</p>;
    if (bits) {
      return (
        <TimetableEditor
          initial={bits}
          warnings={warnings}
          onSaved={() => router.push(withPendingInvite("/meetings"))}
        />
      );
    }
    if (uploading) {
      return (
        <TimetableUpload
          onRecognized={handleRecognized}
          onManual={startManual}
          onCancel={() => setUploading(false)}
        />
      );
    }
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setUploading(true)}
          className="btn btn-primary"
        >
          이미지로 등록
        </button>
        <button
          type="button"
          onClick={startManual}
          className="btn btn-secondary"
        >
          직접 입력
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="page-title">시간표 등록</h1>
      {renderContent()}
    </div>
  );
}
