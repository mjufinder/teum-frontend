// 공지사항·댓글 API 응답 타입. 백엔드 schemas/notice.py, notice_comment.py 와 1:1 대응.

export interface NoticeListItem {
  notice_id: number;
  author_user_id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

// 상세는 목록 항목에 본문이 추가된다.
export interface Notice extends NoticeListItem {
  content: string;
}

export interface NoticeListOut {
  items: NoticeListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface NoticeComment {
  comment_id: number;
  notice_id: number;
  author_user_id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface NoticeCommentListOut {
  items: NoticeComment[];
  total: number;
  page: number;
  page_size: number;
}
