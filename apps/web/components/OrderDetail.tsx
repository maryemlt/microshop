"use client";

import { useEffect, useState } from "react";
import { errorMessage, gatewayApi } from "@/lib/api-client";
import { formatCurrency, formatDate, ORDER_STATUS_LABELS } from "@/lib/format";
import { FINAL_ORDER_STATUSES, ORDER_STATUSES, type Order, type OrderDetail as OrderDetailData, type OrderStatus } from "@/lib/types";
import { OrderStatusBadge } from "./Badges";

interface OrderDetailProps {
  orderId: number;
  /** Incrémenté par le parent pour forcer le rechargement de la fiche. */
  version: number;
  onStatusChange: (order: Order, status: OrderStatus) => Promise<void>;
}

/** Fiche commande chargée via la passerelle : GET /api/gateway/orders/[id]. */
export function OrderDetail({ orderId, version, onStatusChange }: OrderDetailProps) {
  const [detail, setDetail] = useState<OrderDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState<OrderStatus | "">("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    gatewayApi
      .order(orderId)
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
  }, [orderId, version]);

  if (error) return <p className="field-error">{error}</p>;
  if (!detail || detail.order.id !== orderId) return <p className="muted">Chargement de la commande…</p>;

  const { order, user } = detail;
  const locked = FINAL_ORDER_STATUSES.includes(order.status);

  async function applyStatus() {
    if (!nextStatus) return;
    setUpdating(true);
    await onStatusChange(order, nextStatus);
    setUpdating(false);
    setNextStatus("");
  }

  return (
    <div className="detail">
      <dl className="detail-list">
        <dt>Client</dt>
        <dd>
          {user ? (
            <>
              <span className="cell-title">{user.name}</span>
              <span className="cell-sub">{user.email}</span>
            </>
          ) : (
            <span className="muted">Utilisateur #{order.userId} supprimé</span>
          )}
        </dd>
        <dt>Statut</dt>
        <dd>
          <OrderStatusBadge status={order.status} />
        </dd>
        <dt>Créée le</dt>
        <dd>{formatDate(order.createdAt)}</dd>
        <dt>Mise à jour</dt>
        <dd>{formatDate(order.updatedAt)}</dd>
      </dl>

      {locked ? (
        <p className="muted status-hint">Statut définitif : une commande livrée ou annulée ne change plus.</p>
      ) : (
        <div className="status-change">
          <select
            value={nextStatus}
            onChange={(event) => setNextStatus(event.target.value as OrderStatus | "")}
            aria-label="Nouveau statut"
          >
            <option value="">Nouveau statut…</option>
            {ORDER_STATUSES.filter((status) => status !== order.status).map((status) => (
              <option key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-secondary btn-sm" disabled={!nextStatus || updating} onClick={() => void applyStatus()}>
            {updating ? "Mise à jour…" : "Appliquer"}
          </button>
        </div>
      )}

      <table className="table table-compact">
        <thead>
          <tr>
            <th scope="col">Produit</th>
            <th scope="col" className="num">
              Qté
            </th>
            <th scope="col" className="num">
              Montant
            </th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={index}>
              <td>{item.product}</td>
              <td className="num">
                {item.quantity} × {formatCurrency(item.unitPrice)}
              </td>
              <td className="num">{formatCurrency(item.quantity * item.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={2}>
              Total
            </th>
            <td className="num">
              <strong>{formatCurrency(order.total)}</strong>
            </td>
          </tr>
        </tfoot>
      </table>
      <p className="source-note">
        Source : <code>GET /api/gateway/orders/{order.id}</code>
      </p>
    </div>
  );
}
