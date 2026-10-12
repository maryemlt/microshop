"use client";

import { useEffect, useState } from "react";
import { errorMessage, gatewayApi } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";
import type { UserDetail as UserDetailData } from "@/lib/types";
import { OrderStatusBadge, RoleLabel, UserStatusBadge } from "./Badges";

/** Fiche utilisateur chargée via la passerelle : GET /api/gateway/users/[id]. */
export function UserDetail({ userId, version }: { userId: number; version: number }) {
  const [detail, setDetail] = useState<UserDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    gatewayApi
      .user(userId)
      .then((response) => {
        if (!cancelled) setDetail(response.data);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setDetail(null);
          setError(errorMessage(reason));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId, version]);

  if (error) return <p className="field-error">{error}</p>;
  if (!detail || detail.user.id !== userId) return <p className="muted">Chargement de la fiche…</p>;

  const { user, orders, totalSpent } = detail;
  return (
    <div className="detail">
      <dl className="detail-list">
        <dt>Nom</dt>
        <dd>{user.name}</dd>
        <dt>E-mail</dt>
        <dd>{user.email}</dd>
        <dt>Rôle</dt>
        <dd>
          <RoleLabel role={user.role} />
        </dd>
        <dt>Statut</dt>
        <dd>
          <UserStatusBadge status={user.status} />
        </dd>
        <dt>Inscrit le</dt>
        <dd>{formatDate(user.createdAt)}</dd>
        <dt>Total dépensé</dt>
        <dd>{formatCurrency(totalSpent)}</dd>
      </dl>

      <h3>Commandes ({orders.length})</h3>
      {orders.length === 0 ? (
        <p className="muted">Aucune commande pour cet utilisateur.</p>
      ) : (
        <table className="table table-compact">
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="num-id">#{order.id}</td>
                <td className="num">{formatCurrency(order.total)}</td>
                <td>
                  <OrderStatusBadge status={order.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="source-note">
        Source : <code>GET /api/gateway/users/{user.id}</code>
      </p>
    </div>
  );
}
