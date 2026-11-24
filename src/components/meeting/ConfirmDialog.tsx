"use client";

import { useEffect } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  tone = "default",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-[14px] border border-ink-line-2 bg-ink-base p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col gap-1.5">
          <h3 id="confirm-dialog-title" className="text-base font-bold text-ink-text">
            {title}
          </h3>
          <p className="text-xs leading-relaxed text-ink-text-3">{description}</p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-[8px] border border-ink-line-2 px-3.5 text-xs font-semibold text-ink-text-2 transition-colors hover:bg-ink-2 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`inline-flex h-9 items-center rounded-[8px] px-4 text-xs font-bold transition-colors disabled:opacity-50 ${
              tone === "danger"
                ? "bg-live text-white hover:opacity-90"
                : "bg-neon text-on-neon hover:bg-neon-2"
            }`}
          >
            {busy ? "처리 중..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
