import type { ReactNode } from "react";
import { ORDER_STATUS_LABELS, ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/format";
import type { OrderStatus, UserRole, UserStatus } from "@/lib/types";

type Tone = "good" | "warning" | "critical" | "info" | "neutral";

const ORDER_TONES: Record<OrderStatus, Tone> = {
  pending: "warning",
  paid: "info",
  shipped: "info",
  delivered: "good",
  cancelled: "critical",
};

/** Le libellé est toujours affiché : la couleur ne porte jamais seule l'information. */
function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`badge badge-${tone}`}>
      <span className="badge-dot" aria-hidden="true" />
      {children}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={ORDER_TONES[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <Badge tone={status === "active" ? "good" : "neutral"}>{USER_STATUS_LABELS[status]}</Badge>;
}

export function RoleLabel({ role }: { role: UserRole }) {
  return <span className="role-label">{ROLE_LABELS[role]}</span>;
}
