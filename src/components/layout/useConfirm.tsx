"use client";

import { useCallback, useRef, useState } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";

interface ConfirmOptions {
  title: string;
  description: string;
  actionLabel: string;
  // 되돌릴 수 없는 삭제·탈퇴는 destructive, 그 밖의 확인은 primary
  tone?: "primary" | "destructive";
}

// window.confirm 대신 쓰는 확인 대화상자.
// const [confirm, dialog] = useConfirm(); if (!(await confirm({...}))) return;
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((next: ConfirmOptions) => {
    resolver.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const dialog = (
    <AlertDialog
      isOpen={options !== null}
      onOpenChange={(open) => {
        if (!open) settle(false);
      }}
      title={options?.title ?? ""}
      description={options?.description ?? ""}
      actionLabel={options?.actionLabel ?? "확인"}
      cancelLabel="취소"
      actionVariant={options?.tone ?? "primary"}
      onAction={() => settle(true)}
    />
  );

  return [confirm, dialog] as const;
}
