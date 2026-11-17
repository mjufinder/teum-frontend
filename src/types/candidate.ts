export interface Candidate {
  candidate_id: number;
  rank_no: number;
  // 월=0 ~ 일=6
  day_of_week: number;
  // 한국 현지 시각 "HH:MM:SS"
  start_time: string;
  end_time: string;
  available_count: number;
  // users.id 가 아니라 meeting_members.id (= Member.member_id)
  available_member_ids: number[];
}

export interface CandidateSet {
  meeting_id: number;
  run_id: number;
  set_id: number;
  result_status: "HAS_CANDIDATE" | "NO_CANDIDATE";
  vote_status: "OPEN" | "CLOSED" | "DISCARDED";
  created_at: string;
  candidates: Candidate[];
}
