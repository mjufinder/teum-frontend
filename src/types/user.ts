export interface UserOut {
  user_id: number;
  name: string;
  major: string | null;
  profile_completed: boolean;
  // 서비스 권한. 공지 작성·수정·삭제는 ADMIN 만 가능하다. (응답에 없으면 USER 로 본다)
  role?: "USER" | "ADMIN";
}
