export interface VoteRequest {
  candidate_ids: number[];
  no_available: boolean;
}

export interface Ballot {
  ballot_id: number;
  set_id: number;
  member_id: number;
  no_available: boolean;
  candidate_ids: number[];
}

export interface CandidateTally {
  candidate_id: number;
  rank_no: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  available_count: number;
  votes: number;
}

export interface Tally {
  set_id: number;
  vote_status: "OPEN" | "CLOSED" | "DISCARDED";
  total_ballots: number;
  no_available_count: number;
  candidates: CandidateTally[];
  // 득표 → 참석 인원 → 추천 순위 순으로 고른 현재 1위. 아무도 투표하지 않아도 값이 온다.
  winner_candidate_id: number | null;
}
