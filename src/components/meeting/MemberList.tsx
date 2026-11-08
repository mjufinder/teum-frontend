import type { Member } from "@/types/meeting";

interface MemberListProps {
  members: Member[];
  myUserId: number;
  emails: Record<number, string>;
  // 넘기면 관리자가 아닌 다른 구성원 옆에 위임 버튼을 보여 준다
  onTransfer?: (member: Member) => void;
  busy?: boolean;
}

export function memberLabel(
  member: Member,
  myUserId: number,
  emails: Record<number, string>
) {
  if (member.user_id === myUserId) return "나";
  return emails[member.user_id] ?? `팀원 ${member.user_id}`;
}

export default function MemberList({
  members,
  myUserId,
  emails,
  onTransfer,
  busy = false,
}: MemberListProps) {
  return (
    <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
      {members.map((m) => (
        <li
          key={m.member_id}
          className="flex items-center gap-2 px-5 py-3 text-sm"
        >
          <span>{m.user_id === myUserId ? "나" : `팀원 ${m.user_id}`}</span>
          {emails[m.user_id] && (
            <span className="text-muted">{emails[m.user_id]}</span>
          )}
          {m.role === "ADMIN" && (
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">
              관리자
            </span>
          )}
          {onTransfer && m.role !== "ADMIN" && m.user_id !== myUserId && (
            <button
              type="button"
              onClick={() => onTransfer(m)}
              disabled={busy}
              className="ml-auto whitespace-nowrap rounded-md border border-line bg-surface px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50"
            >
              관리자 넘기기
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
