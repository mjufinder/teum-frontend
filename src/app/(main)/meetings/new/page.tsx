"use client";

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
    <div className="flex flex-col gap-4">
      <h1 className="page-title">새 모임</h1>
      <MeetingForm initial={initial} submitLabel="만들기" onSubmit={handleSubmit} />
    </div>
  );
}
