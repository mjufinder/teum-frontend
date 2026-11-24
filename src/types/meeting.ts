export interface ConfirmedSlot {
  candidate_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  confirmed_at: string;
}

export interface Meeting {
  meeting_id: number;
  name: string;
  description: string | null;
  period_start: string;
  period_end: string;
  search_start_time: string;
  search_end_time: string;
  travel_buffer_min: number;
  min_duration_min: number;
  needs_recalc: boolean;
  share_token?: string | null;
  confirmed_schedule?: ConfirmedSlot | null;
}

export interface Member {
  member_id: number;
  user_id: number;
  role: "ADMIN" | "MEMBER";
  status: "ACTIVE" | "LEFT";
  has_timetable?: boolean;
}
