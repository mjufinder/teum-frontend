"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Icon } from "@astryxdesign/core/Icon";
import { Heading, Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { PencilSquareIcon, PhotoIcon } from "@heroicons/react/24/outline";

import { ErrorNote, PageLoading } from "@/components/layout/PageState";
import TimetableEditor from "@/components/timetable/TimetableEditor";
import TimetableUpload from "@/components/timetable/TimetableUpload";
import { ApiError } from "@/lib/api";
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
    if (loading) return <PageLoading />;
    if (error) return <ErrorNote message={error} />;
    if (bits) {
      return (
        <TimetableEditor
          initial={bits}
          warnings={warnings}
          saveLabel="저장하고 시작하기"
          onSaved={() => router.push("/meetings")}
        />
      );
    }
    if (uploading) {
      return (
        <div className="max-w-[560px]">
          <TimetableUpload
            onRecognized={handleRecognized}
            onManual={startManual}
            onCancel={() => setUploading(false)}
          />
        </div>
      );
    }
    return (
      <div className="grid max-w-[640px] gap-4 sm:grid-cols-2">
        <ClickableCard label="이미지로 등록" onClick={() => setUploading(true)} padding={5} elevation="low">
          <VStack gap={2}>
            <Icon icon={PhotoIcon} size="lg" color="accent" />
            <Text type="large" weight="bold">이미지로 등록</Text>
            <Text type="supporting">에브리타임 시간표 이미지를 올리면 수업 시간을 읽어 와요.</Text>
          </VStack>
        </ClickableCard>
        <ClickableCard label="직접 입력" onClick={startManual} padding={5}>
          <VStack gap={2}>
            <Icon icon={PencilSquareIcon} size="lg" color="accent" />
            <Text type="large" weight="bold">직접 입력</Text>
            <Text type="supporting">빈 시간표에서 칸을 눌러 수업과 일정을 칠해요.</Text>
          </VStack>
        </ClickableCard>
      </div>
    );
  }

  return (
    <VStack gap={6}>
      <VStack gap={1}>
        <Heading level={1}>시간표 등록</Heading>
        <Text color="secondary">수업이 있는 시간을 알려 주면 빈 시간에서 회의 시간을 찾아요.</Text>
      </VStack>
      {renderContent()}
    </VStack>
  );
}
