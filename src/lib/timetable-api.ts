import { ApiError, authFetch } from "@/lib/api";
import type { RecognizedTimetable, TimetableBits } from "@/types/timetable";

export async function recognizeTimetable(file: File) {
  const body = new FormData();
  body.append("file", file);
  return authFetch<RecognizedTimetable>("/api/v1/timetable/recognize", {
    method: "POST",
    body,
  });
}

export async function getMyTimetable() {
  try {
    return await authFetch<TimetableBits>("/api/v1/timetable");
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function saveMyTimetable(classBits: string, manualBits: string) {
  return authFetch<TimetableBits>("/api/v1/timetable", {
    method: "PUT",
    body: JSON.stringify({ class_bits: classBits, manual_bits: manualBits }),
  });
}
