import { toHHMM } from "@/lib/meetings";
import { emptyBits, index as cellIndex, paintCells, SLOT_COUNT } from "@/lib/timetable";
import { getMyTimetable, saveMyTimetable } from "@/lib/timetable-api";

const DAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"];

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * 확정 일정 티켓 카드를 고해상도 PNG 이미지로 렌더링해 다운로드한다.
 */
export function downloadScheduleCardPng({
  meetingName,
  description,
  memberCount,
  dayOfWeek,
  startTime,
  endTime,
  nextDateLabel,
  durationLabel,
  confirmedLabel,
}: {
  meetingName: string;
  description?: string | null;
  memberCount?: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  nextDateLabel: string;
  durationLabel: string | null;
  confirmedLabel: string;
}) {
  const isDark = document.documentElement.classList.contains("dark");
  const w = 960;
  const h = 1120;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const palette = isDark
    ? {
        bg: "#0a0e0c",
        card: "#111714",
        border: "#222d27",
        text: "#f4f7f5",
        muted: "#98a69e",
        neon: "#00ffa3",
        onNeon: "#052e1e",
        heroBg: "rgba(0, 255, 163, 0.09)",
        heroBorder: "rgba(0, 255, 163, 0.42)",
        footer: "#0d120f",
      }
    : {
        bg: "#f5f7f6",
        card: "#ffffff",
        border: "#e0e6e2",
        text: "#101814",
        muted: "#5b6961",
        neon: "#008f5a",
        onNeon: "#ffffff",
        heroBg: "rgba(0, 143, 90, 0.08)",
        heroBorder: "rgba(0, 143, 90, 0.35)",
        footer: "#f8faf9",
      };

  // 배경
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, w, h);

  // 카드 본체
  const pad = 64;
  const cardW = w - pad * 2;
  const cardH = h - pad * 2;
  ctx.save();
  roundRect(ctx, pad, pad, cardW, cardH, 32);
  ctx.fillStyle = palette.card;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = palette.border;
  ctx.stroke();
  ctx.clip();

  // 상단 네온 바
  ctx.fillStyle = palette.neon;
  ctx.fillRect(pad, pad, cardW, 10);

  // 브랜드 헤더
  const innerX = pad + 56;
  const innerW = cardW - 112;
  ctx.fillStyle = palette.neon;
  ctx.font = "700 28px 'IBM Plex Sans KR', sans-serif";
  ctx.fillText("틈 TEUM", innerX, pad + 84);

  // 확정 완료 배지
  const badgeText = "확정된 정기 일정";
  ctx.font = "700 22px 'IBM Plex Sans KR', sans-serif";
  const badgeW = ctx.measureText(badgeText).width + 40;
  roundRect(ctx, innerX + innerW - badgeW, pad + 52, badgeW, 44, 22);
  ctx.fillStyle = palette.heroBg;
  ctx.fill();
  ctx.strokeStyle = palette.heroBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = palette.neon;
  ctx.fillText(badgeText, innerX + innerW - badgeW + 20, pad + 81);

  // 모임 이름
  ctx.fillStyle = palette.text;
  ctx.font = "700 50px 'IBM Plex Sans KR', sans-serif";
  const clippedTitle =
    meetingName.length > 18 ? `${meetingName.slice(0, 17)}…` : meetingName;
  ctx.fillText(clippedTitle, innerX, pad + 195);

  // 모임 설명
  if (description) {
    ctx.fillStyle = palette.muted;
    ctx.font = "400 26px 'IBM Plex Sans KR', sans-serif";
    const clippedDesc =
      description.length > 34 ? `${description.slice(0, 33)}…` : description;
    ctx.fillText(clippedDesc, innerX, pad + 245);
  }

  // 히어로 시간 박스
  const heroY = pad + 310;
  const heroH = 330;
  roundRect(ctx, innerX, heroY, innerW, heroH, 24);
  ctx.fillStyle = palette.heroBg;
  ctx.fill();
  ctx.strokeStyle = palette.heroBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  const dayLabel = `매주 ${DAY_NAMES[dayOfWeek] ?? ""}요일`;
  ctx.fillStyle = palette.neon;
  ctx.font = "700 28px 'IBM Plex Sans KR', sans-serif";
  ctx.fillText(dayLabel, innerX + 40, heroY + 66);

  if (durationLabel) {
    ctx.font = "600 22px 'IBM Plex Sans KR', sans-serif";
    const durW = ctx.measureText(durationLabel).width + 32;
    roundRect(ctx, innerX + innerW - 40 - durW, heroY + 34, durW, 42, 12);
    ctx.fillStyle = palette.card;
    ctx.fill();
    ctx.fillStyle = palette.text;
    ctx.fillText(durationLabel, innerX + innerW - 40 - durW + 16, heroY + 62);
  }

  // 대형 시간
  const timeText = `${toHHMM(startTime)} – ${toHHMM(endTime)}`;
  ctx.fillStyle = palette.text;
  ctx.font = "700 72px 'IBM Plex Sans KR', sans-serif";
  ctx.fillText(timeText, innerX + 40, heroY + 178);

  // 히어로 점선
  ctx.save();
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = palette.heroBorder;
  ctx.beginPath();
  ctx.moveTo(innerX + 40, heroY + 232);
  ctx.lineTo(innerX + innerW - 40, heroY + 232);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = palette.muted;
  ctx.font = "500 24px 'IBM Plex Sans KR', sans-serif";
  ctx.fillText(`다음 일정: ${nextDateLabel} (KST)`, innerX + 40, heroY + 286);

  // 참여 인원 & 안내
  ctx.fillStyle = palette.muted;
  ctx.font = "500 24px 'IBM Plex Sans KR', sans-serif";
  const memberText =
    typeof memberCount === "number" && memberCount > 0
      ? `참여 인원 ${memberCount}명 · 매주 반복`
      : "매주 반복 일정";
  ctx.fillText(memberText, innerX, heroY + heroH + 74);

  // 하단 푸터 스트립
  const footerH = 104;
  const footerY = pad + cardH - footerH;
  ctx.fillStyle = palette.footer;
  ctx.fillRect(pad, footerY, cardW, footerH);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad, footerY);
  ctx.lineTo(pad + cardW, footerY);
  ctx.stroke();

  ctx.fillStyle = palette.muted;
  ctx.font = "500 22px 'IBM Plex Sans KR', sans-serif";
  ctx.fillText(`${confirmedLabel} 확정`, innerX, footerY + 60);

  ctx.fillStyle = palette.neon;
  ctx.font = "700 22px 'IBM Plex Sans KR', sans-serif";
  const brandFoot = "teum";
  const bw = ctx.measureText(brandFoot).width;
  ctx.fillText(brandFoot, innerX + innerW - bw, footerY + 60);

  ctx.restore();

  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${meetingName.replace(/[^\w가-힣-]+/g, "_")}_일정카드.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * 확정된 요일·시간 구간을 로그인 사용자의 개인 시간표(manual_bits)에 반영한다.
 */
export async function applyScheduleToMyTimetable(
  dayOfWeek: number,
  startTime: string,
  endTime: string
) {
  const [sh, sm] = toHHMM(startTime).split(":").map(Number);
  const [eh, em] = toHHMM(endTime).split(":").map(Number);

  const startSlot = Math.max(0, Math.floor((sh * 60 + sm - 9 * 60) / 30));
  const endSlot = Math.min(SLOT_COUNT, Math.ceil((eh * 60 + em - 9 * 60) / 30));

  const cells: number[] = [];
  for (let s = startSlot; s < endSlot; s += 1) {
    cells.push(cellIndex(dayOfWeek, s));
  }
  if (cells.length === 0) return;

  const current = (await getMyTimetable()) ?? {
    class_bits: emptyBits(),
    manual_bits: emptyBits(),
  };
  const next = paintCells(current, cells, "manual");
  await saveMyTimetable(next.class_bits, next.manual_bits);
}
