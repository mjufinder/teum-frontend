"use client";

import { FileImage, Sparkles, Upload } from "lucide-react";
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
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function selectFile(selected: File | undefined) {
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

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    selectFile(e.target.files?.[0]);
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    if (loading) return;
    selectFile(e.dataTransfer.files?.[0]);
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
    <div className="flex flex-col gap-5 rounded-[20px] border border-ink-line bg-ink-1 p-6">
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-neon">
          <Sparkles className="size-3.5" />
          에브리타임 이미지 인식
        </span>
        <p className="text-xs text-ink-text-3">
          에브리타임 앱 → 시간표 탭 → 설정 → 이미지로 저장한 파일을 끌어오거나 선택해 주세요.
        </p>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-[14px] border-2 border-dashed p-8 text-center transition-colors ${
          dragging
            ? "border-neon bg-neon/10"
            : "border-ink-line-2 bg-ink-base hover:border-neon/60 hover:bg-neon/5"
        }`}
      >
        <span className="grid size-12 place-items-center rounded-full bg-ink-2 text-neon">
          <Upload className="size-5" />
        </span>
        <div>
          <p className="text-sm font-bold text-ink-text">
            {file ? file.name : "시간표 이미지 선택 또는 드래그"}
          </p>
          <p className="mt-1 text-xs text-ink-text-weak">PNG, JPEG · 10MB 이하</p>
        </div>
        <input
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFile}
          disabled={loading}
          className="sr-only"
        />
      </label>

      {preview && file && (
        <div className="flex flex-col gap-2 rounded-[12px] border border-ink-line bg-ink-base p-3">
          <div className="flex items-center gap-2 text-xs text-ink-text-3">
            <FileImage className="size-3.5 text-neon" />
            <span className="truncate font-medium text-ink-text-2">{file.name}</span>
            <span className="ml-auto shrink-0 tabular-nums">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
          <div className="relative h-44 w-full overflow-hidden rounded-[8px] bg-ink-1">
            <Image
              src={preview}
              alt="고른 시간표 이미지"
              fill
              unoptimized
              className="object-contain object-left p-2"
            />
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-[10px] border-l-2 border-live bg-ink-2 px-4 py-3 text-xs text-ink-text-2">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!file || loading}
          onClick={handleRecognize}
          className="inline-flex h-10 items-center justify-center rounded-full bg-neon px-5 text-xs font-bold text-on-neon transition-colors hover:bg-neon-2 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {loading ? "읽는 중이에요..." : "인식하기"}
        </button>
        {error && (
          <button
            type="button"
            onClick={onManual}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center rounded-full border border-ink-line-2 px-5 text-xs font-bold text-ink-text transition-colors hover:bg-ink-2"
          >
            직접 입력하기
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center rounded-full border border-ink-line-2 px-5 text-xs font-bold text-ink-text transition-colors hover:bg-ink-2"
        >
          취소
        </button>
      </div>
    </div>
  );
}
