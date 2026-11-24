export interface Invite {
  invite_code: string;
  invite_path: string;
  expires_at: string;
}

export interface InvitePreview {
  meeting_id: number;
  meeting_name: string;
  description: string | null;
  member_count: number;
  expires_at: string;
}

export interface InviteJoinResult {
  meeting_id: number;
  already_member: boolean;
  member: {
    member_id: number;
    user_id: number;
    role: "ADMIN" | "MEMBER";
    status: "ACTIVE" | "LEFT";
  };
}
