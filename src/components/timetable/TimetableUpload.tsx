"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { FileInput } from "@astryxdesign/core/FileInput";
import { HStack } from "@astryxdesign/core/HStack";
import { VStack } from "@astryxdesign/core/VStack";

import { ApiError } from "@/lib/api";
import { recognizeTimetable } from "@/lib/timetable-api";
import type { RecognizedTimetable } from "@/types/timetable";

const MAX_SIZE = 10 * 1024 * 1024;

interface TimetableUploadProps {
  onRecognized: (result: RecognizedTimetable) => void;
  onManual: () => void;
  onCancel: () => void;
}

export default function TimetableUpload({ onRecognized, onManual, onCancel }: TimetableUploadProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function handleFile(files: File | File[] | null) {
    const selected = Array.isArray(files) ? files[0] : files;
    if (!selected) {
      setFile(null);
      setPreview(null);
      return;
    }

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
    <Card padding={5}>
      <VStack gap={4}>
        <FileInput
          mode="dropzone"
          label="시간표 이미지"
          description="에브리타임 앱의 시간표 탭에서 설정 아이콘을 누르고 '이미지로 저장'을 고르면 돼요. PNG·JPEG, 10MB 이하"
          placeholder="이미지를 끌어다 놓거나 눌러서 고르세요"
          accept="image/png,image/jpeg"
          value={file}
          onChange={handleFile}
          isDisabled={loading}
        />

        {preview && (
          <div className="relative h-44 w-full overflow-hidden rounded-[10px] bg-[var(--teum-slot-free)]">
            <Image src={preview} alt="고른 시간표 이미지" fill unoptimized className="object-contain" />
          </div>
        )}

        {error && <Banner status="error" title={error} />}

        <HStack gap={2} wrap="wrap">
          <Button
            label={loading ? "읽는 중이에요" : "인식하기"}
            variant="primary"
            isLoading={loading}
            isDisabled={!file}
            onClick={handleRecognize}
          />
          {error && (
            <Button label="직접 입력하기" variant="secondary" isDisabled={loading} onClick={onManual} />
          )}
          <Button label="취소" variant="ghost" isDisabled={loading} onClick={onCancel} />
        </HStack>
      </VStack>
    </Card>
  );
}
