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
    <ul className="card divide-y divide-line !p-0">
      {members.map((m) => (
        <li
          key={m.member_id}
          className="flex items-center gap-3 px-5 py-3.5 text-sm"
        >
          <span
            aria-hidden
            className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold ${
              m.user_id === myUserId
                ? "bg-brand-strong text-surface"
                : "bg-brand-soft text-brand-strong"
            }`}
          >
            {m.user_id === myUserId ? "나" : m.user_id}
          </span>
          <span className="font-semibold">
            {m.user_id === myUserId ? "나" : `팀원 ${m.user_id}`}
          </span>
          {emails[m.user_id] && (
            <span className="min-w-0 truncate text-muted">{emails[m.user_id]}</span>
          )}
          {m.role === "ADMIN" && (
            <span className="badge badge-brand">관리자</span>
          )}
          {onTransfer && m.role !== "ADMIN" && m.user_id !== myUserId && (
            <button
              type="button"
              onClick={() => onTransfer(m)}
              disabled={busy}
              className="btn btn-secondary btn-sm ml-auto"
            >
              관리자 넘기기
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
