export type SlotState = "class" | "manual" | "free";

export interface TimetableBits {
  class_bits: string;
  manual_bits: string;
}

export interface RecognizedTimetable extends TimetableBits {
  warnings: string[];
}
