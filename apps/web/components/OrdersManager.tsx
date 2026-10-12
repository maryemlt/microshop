"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, ordersApi, usersApi } from "@/lib/api-client";
import { formatCurrency, formatDate, ORDER_STATUS_LABELS } from "@/lib/format";
import { ORDER_STATUSES, type NewOrderInput, type Order, type OrderStatus, type User } from "@/lib/types";
import { OrderStatusBadge } from "./Badges";
import { Notice, useNotice } from "./Notice";
import { OrderDetail } from "./OrderDetail";
import { OrderForm } from "./OrderForm";

type Panel = { mode: "create" } | { mode: "detail"; orderId: number };

export function OrdersManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [userFilter, setUserFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<Panel>({ mode: "create" });
  const [detailVersion, setDetailVersion] = useState(0);
  const { notice, showSuccess, showError, dismiss } = useNotice();

  const userNames = useMemo(() => new Map(users.map((user) => [user.id, user.name])), [users]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Filtre utilisateur : GET /api/orders/by-user/:userId ; sinon GET /api/orders?status=
      if (userFilter !== null) {
        const { data } = await ordersApi.listByUser(userFilter);
        setOrders(statusFilter ? data.filter((order) => order.status === statusFilter) : data);
      } else {
        setOrders((await ordersApi.list(statusFilter || undefined)).data);
      }
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, userFilter, showError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    usersApi
      .list()
      .then((response) => setUsers(response.data))
      .catch(showError);
  }, [showError]);

  async function createOrder(input: NewOrderInput): Promise<Record<string, string> | undefined> {
    try {
      const { data } = await ordersApi.create(input);
      showSuccess(`Commande n° ${data.id} créée pour ${formatCurrency(data.total)}.`);
      await refresh();
      return undefined;
    } catch (error) {
      showError(error);
      return error instanceof ApiError ? (error.details ?? {}) : {};
    }
  }

  async function changeStatus(order: Order, status: OrderStatus) {
    try {
      await ordersApi.updateStatus(order.id, status);
      showSuccess(`Commande n° ${order.id} : statut « ${ORDER_STATUS_LABELS[status]} ».`);
      setDetailVersion((version) => version + 1);
      await refresh();
    } catch (error) {
      showError(error);
    }
  }

  async function removeOrder(order: Order) {
    if (!window.confirm(`Supprimer la commande n° ${order.id} ?`)) return;
    try {
      await ordersApi.remove(order.id);
      showSuccess(`Commande n° ${order.id} supprimée.`);
      if (panel.mode === "detail" && panel.orderId === order.id) setPanel({ mode: "create" });
      await refresh();
    } catch (error) {
      showError(error);
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Commandes</h1>
          <p className="muted">
            Appels directs à l&apos;Orders Service (port 4102) : <code>/api/orders</code>. La création vérifie
            l&apos;utilisateur auprès du Users Service.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setPanel({ mode: "create" })}>
          + Nouvelle commande
        </button>
      </header>

      <Notice notice={notice} onDismiss={dismiss} />

      <div className="split">
        <section className="card">
          <div className="filters">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as OrderStatus | "")}
              aria-label="Filtrer par statut"
            >
              <option value="">Tous les statuts</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {ORDER_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <select
              value={userFilter ?? ""}
              onChange={(event) => setUserFilter(event.target.value ? Number(event.target.value) : null)}
              aria-label="Filtrer par utilisateur"
            >
              <option value="">Tous les utilisateurs</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  #{user.id} · {user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">N°</th>
                  <th scope="col">Utilisateur</th>
                  <th scope="col">Articles</th>
                  <th scope="col" className="num">
                    Total
                  </th>
                  <th scope="col">Statut</th>
                  <th scope="col">Date</th>
                  <th scope="col" className="actions">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="num-id">#{order.id}</td>
                    <td className="wrap">{userNames.get(order.userId) ?? `Utilisateur #${order.userId}`}</td>
                    <td className="wrap">
                      <span className="cell-title">{order.items[0]?.product}</span>
                      {order.items.length > 1 ? <span className="cell-sub">+ {order.items.length - 1} autre(s)</span> : null}
                    </td>
                    <td className="num">{formatCurrency(order.total)}</td>
                    <td>
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td className="actions">
                      <div className="row-actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPanel({ mode: "detail", orderId: order.id })}>
                          Fiche
                        </button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => void removeOrder(order)}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && orders.length === 0 ? <p className="empty">Aucune commande ne correspond aux filtres.</p> : null}
            {loading && orders.length === 0 ? <p className="empty">Chargement…</p> : null}
          </div>
        </section>

        <aside className="card panel" aria-label={panel.mode === "create" ? "Nouvelle commande" : "Fiche commande"}>
          <div className="card-header">
            <h2>{panel.mode === "create" ? "Nouvelle commande" : `Commande n° ${panel.orderId}`}</h2>
            {panel.mode === "detail" ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPanel({ mode: "create" })}>
                Fermer
              </button>
            ) : null}
          </div>
          {panel.mode === "detail" ? (
            <OrderDetail orderId={panel.orderId} version={detailVersion} onStatusChange={changeStatus} />
          ) : (
            <OrderForm users={users} onSubmit={createOrder} />
          )}
        </aside>
      </div>
    </>
  );
}
