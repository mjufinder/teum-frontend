/** 메시 그라데이션 배경 — 블롭들이 오로라처럼 자동으로 부드럽게 일렁인다. (마우스 상호작용 없음) */
export default function MeshBackground() {
  return (
    <div
      aria-hidden
      className="mesh-bg pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="mesh-blob mesh-blob-1" />
      <div className="mesh-blob mesh-blob-2" />
      <div className="mesh-blob mesh-blob-3" />
      <div className="mesh-blob mesh-blob-4" />
      <div className="mesh-blob mesh-blob-5" />
    </div>
  );
}
