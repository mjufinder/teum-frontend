import type { Member } from "@/types/meeting";

interface MemberListProps {
  members: Member[];
  myUserId: number;
  emails: Record<number, string>;
}

export default function MemberList({
  members,
  myUserId,
  emails,
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
        </li>
      ))}
    </ul>
  );
}
