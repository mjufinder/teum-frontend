import { toHHMM } from "@/lib/meetings";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatLocalStamp(d: Date, hhmm: string) {
  const [h, m] = toHHMM(hhmm).split(":").map(Number);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(h)}${pad(m)}00`;
}

function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

const ICS_BYDAY = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;

export interface NextOccurrence {
  targetDate: Date;
  diffDays: number;
  isOngoing: boolean;
}

/**
 * 확정된 요일(월=0..일=6)과 시간 기준으로 가장 가까운 다가오는 모임 일정을 계산한다.
 */
export function getNextMeetingOccurrence(
  dayOfWeek: number,
  startTime: string,
  endTime: string
): NextOccurrence {
  const now = new Date();
  const todayIdx = (now.getDay() + 6) % 7;
  let diffDays = (dayOfWeek - todayIdx + 7) % 7;
  const [sh, sm] = toHHMM(startTime).split(":").map(Number);
  const [eh, em] = toHHMM(endTime).split(":").map(Number);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  let isOngoing = false;
  if (diffDays === 0) {
    if (nowMinutes >= startMinutes && nowMinutes < endMinutes) {
      isOngoing = true;
    } else if (nowMinutes >= endMinutes) {
      diffDays = 7;
    }
  }

  const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffDays);
  return { targetDate, diffDays, isOngoing };
}

/**
 * Google 캘린더 매주 반복 일정 추가 URL을 생성한다.
 */
export function buildGoogleCalendarUrl({
  meetingName,
  description,
  dayOfWeek,
  startTime,
  endTime,
}: {
  meetingName: string;
  description?: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}) {
  const { targetDate } = getNextMeetingOccurrence(dayOfWeek, startTime, endTime);
  const dtStart = formatLocalStamp(targetDate, startTime);
  const dtEnd = formatLocalStamp(targetDate, endTime);
  const byDay = ICS_BYDAY[dayOfWeek] ?? "MO";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: meetingName,
    dates: `${dtStart}/${dtEnd}`,
    ctz: "Asia/Seoul",
    recur: `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`,
  });
  if (description) {
    params.set("details", description);
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * 확정된 요일(월=0..일=6)의 다가오는 날짜를 기준으로 .ics 캘린더 파일을 생성해 다운로드한다.
 */
export function downloadMeetingIcs({
  meetingName,
  description,
  dayOfWeek,
  startTime,
  endTime,
}: {
  meetingName: string;
  description?: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}) {
  const now = new Date();
  const { targetDate: target } = getNextMeetingOccurrence(dayOfWeek, startTime, endTime);

  const dtStart = formatLocalStamp(target, startTime);
  const dtEnd = formatLocalStamp(target, endTime);
  const dtStamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TEUM//Meeting Schedule//KO",
    "BEGIN:VEVENT",
    `UID:teum-${dtStart}-${Math.random().toString(36).slice(2, 8)}@teum`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;TZID=Asia/Seoul:${dtStart}`,
    `DTEND;TZID=Asia/Seoul:${dtEnd}`,
    `SUMMARY:${escapeIcsText(meetingName)}`,
    description ? `DESCRIPTION:${escapeIcsText(description)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${meetingName.replace(/[^\w가-힣-]+/g, "_")}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
