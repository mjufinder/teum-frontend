"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { recognizeTimetable } from "@/lib/timetable-api";
import type { RecognizedTimetable } from "@/types/timetable";

const MAX_SIZE = 10 * 1024 * 1024;

interface TimetableUploadProps {
  onRecognized: (result: RecognizedTimetable) => void;
  onManual: () => void;
  onCancel: () => void;
}

export default function TimetableUpload({
  onRecognized,
  onManual,
  onCancel,
}: TimetableUploadProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    let message = null;
    if (selected.type !== "image/png" && selected.type !== "image/jpeg") {
      message = "PNG 또는 JPEG 이미지만 올릴 수 있어요.";
    } else if (selected.size > MAX_SIZE) {
      message = "10MB 이하 이미지만 올릴 수 있어요.";
    }

    setError(message);
    setFile(message ? null : selected);
    setPreview(message ? null : URL.createObjectURL(selected));
  }

  async function handleRecognize() {
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      onRecognized(await recognizeTimetable(file));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setError(e instanceof ApiError ? e.message : "시간표를 읽지 못했어요. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card flex flex-col gap-5">
      <p className="text-sm text-muted">
        에브리타임 앱의 시간표 탭에서 설정 아이콘을 누르고 이미지로 저장을 고르면 돼요.
      </p>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">시간표 이미지 <span className="font-normal text-muted">(PNG, JPEG / 10MB 이하)</span></span>
        <input
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFile}
          disabled={loading}
          className="input"
        />
      </label>

      {preview && (
        <div className="relative h-40 w-full overflow-hidden rounded-[14px] bg-sunken">
          <Image
            src={preview}
            alt="고른 시간표 이미지"
            fill
            unoptimized
            className="object-contain object-left"
          />
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!file || loading}
          onClick={handleRecognize}
          className="btn btn-primary"
        >
          {loading ? "읽는 중이에요..." : "인식하기"}
        </button>
        {error && (
          <button
            type="button"
            onClick={onManual}
            disabled={loading}
            className="btn btn-secondary"
          >
            직접 입력하기
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="btn btn-secondary"
        >
          취소
        </button>
      </div>
    </div>
  );
}
