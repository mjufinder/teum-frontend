export interface Memo {
  memo_id: number;
  meeting_id: number;
  author_user_id: number;
  content: string;
  // 작성 직후 응답에서는 null 일 수 있다
  created_at: string | null;
}
