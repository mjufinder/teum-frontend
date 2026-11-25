"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import MeetingForm, { type MeetingFormValues } from "@/components/meeting/MeetingForm";
import {
  DEFAULT_MIN_DURATION,
  DEFAULT_SEARCH_END,
  DEFAULT_SEARCH_START,
  DEFAULT_TRAVEL_BUFFER,
  createMeeting,
} from "@/lib/meetings";

const initial: MeetingFormValues = {
  name: "",
  description: "",
  minDuration: DEFAULT_MIN_DURATION,
  searchStartTime: DEFAULT_SEARCH_START,
  searchEndTime: DEFAULT_SEARCH_END,
  travelBufferMin: DEFAULT_TRAVEL_BUFFER,
};

export default function NewMeetingPage() {
  const router = useRouter();

  async function handleSubmit(values: MeetingFormValues) {
    const meeting = await createMeeting({
      ...values,
      description: values.description || null,
    });
    router.replace(`/meetings/${meeting.meeting_id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/meetings"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-ink-text-3 transition-colors hover:text-ink-text"
        >
          <ArrowLeft className="size-3.5" />
          내 모임
        </Link>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink-text">
          새 모임
        </h1>
      </div>

      <MeetingForm
        initial={initial}
        submitLabel="만들기"
        showSummary
        draftKey="teum:new_meeting_draft"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
