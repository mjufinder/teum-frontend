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
}

export interface Member {
  member_id: number;
  user_id: number;
  role: "ADMIN" | "MEMBER";
  status: "ACTIVE" | "LEFT";
}
