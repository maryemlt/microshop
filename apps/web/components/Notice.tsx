"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/lib/api-client";

export interface NoticeState {
  kind: "success" | "error";
  message: string;
}

/** Message de succès / d'erreur partagé par les pages de gestion. */
export function useNotice() {
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const showSuccess = useCallback((message: string) => setNotice({ kind: "success", message }), []);
  const showError = useCallback((error: unknown) => setNotice({ kind: "error", message: errorMessage(error) }), []);
  const dismiss = useCallback(() => setNotice(null), []);

  return { notice, showSuccess, showError, dismiss };
}

export function Notice({ notice, onDismiss }: { notice: NoticeState | null; onDismiss: () => void }) {
  useEffect(() => {
    if (notice?.kind !== "success") return undefined;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [notice, onDismiss]);

  if (!notice) return null;

  return (
    <div className={`notice notice-${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
      <span className="notice-icon" aria-hidden="true">
        {notice.kind === "success" ? "✓" : "!"}
      </span>
      <p>{notice.message}</p>
      <button type="button" className="btn-icon" onClick={onDismiss} aria-label="Fermer le message">
        ×
      </button>
    </div>
  );
}
