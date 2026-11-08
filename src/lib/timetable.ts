import type { SlotState, TimetableBits } from "@/types/timetable";

export const DAY_COUNT = 7;
export const SLOT_COUNT = 26;
export const TOTAL_SLOTS = DAY_COUNT * SLOT_COUNT;
export const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

export function index(day: number, slot: number) {
  return day * SLOT_COUNT + slot;
}

export function slotLabel(slot: number) {
  const minutes = 9 * 60 + slot * 30;
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return `${hour}:${minute}`;
}

export function emptyBits() {
  return "1".repeat(TOTAL_SLOTS);
}

// 두 비트가 모두 0이면 수업으로 표시한다.
export function slotState(bits: TimetableBits, cell: number): SlotState {
  if (bits.class_bits[cell] === "0") return "class";
  if (bits.manual_bits[cell] === "0") return "manual";
  return "free";
}

function setCells(bits: string, cells: number[], value: "0" | "1") {
  const chars = bits.split("");
  for (const cell of cells) {
    chars[cell] = value;
  }
  return chars.join("");
}

export function paintCells(
  bits: TimetableBits,
  cells: number[],
  state: SlotState
): TimetableBits {
  if (state === "class") {
    return { ...bits, class_bits: setCells(bits.class_bits, cells, "0") };
  }
  if (state === "manual") {
    return { ...bits, manual_bits: setCells(bits.manual_bits, cells, "0") };
  }
  return {
    class_bits: setCells(bits.class_bits, cells, "1"),
    manual_bits: setCells(bits.manual_bits, cells, "1"),
  };
}
