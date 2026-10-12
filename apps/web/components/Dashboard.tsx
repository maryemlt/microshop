"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { errorMessage, gatewayApi } from "@/lib/api-client";
import { formatCurrency, formatDate, ORDER_STATUS_LABELS, ROLE_LABELS } from "@/lib/format";
import { ORDER_STATUSES, USER_ROLES, type DashboardData, type HealthReport, type ServiceName } from "@/lib/types";
import { OrderStatusBadge } from "./Badges";
import { BarList } from "./BarList";
import { StatTile } from "./StatTile";

const SERVICE_LABELS: Record<ServiceName, string> = {
  "users-service": "Users Service · 4101",
  "orders-service": "Orders Service · 4102",
};

function HealthStrip({ health, loading }: { health: HealthReport | null; loading: boolean }) {
  if (!health) {
    return (
      <p className="muted">
        {loading ? "Vérification de l'état des services…" : "État des services indisponible : la passerelle ne répond pas."}
      </p>
    );
  }

  return (
    <ul className="health-strip" aria-label="État des microservices">
      {(Object.keys(SERVICE_LABELS) as ServiceName[]).map((service) => {
        const state = health.services[service];
        const up = state.status === "up";
        return (
          <li key={service} className={`health-item ${up ? "is-up" : "is-down"}`}>
            <span className="health-icon" aria-hidden="true">
              {up ? "✓" : "✕"}
            </span>
            <span>
              <strong>{SERVICE_LABELS[service]}</strong>
              <span className="muted">
                {up ? `Opérationnel · ${state.latencyMs} ms` : `Indisponible · ${state.error ?? "erreur"}`}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [dashboard, healthReport] = await Promise.allSettled([gatewayApi.dashboard(), gatewayApi.health()]);

    if (dashboard.status === "fulfilled") {
      setData(dashboard.value.data);
      setError(null);
    } else {
      setError(errorMessage(dashboard.reason));
    }
    setHealth(healthReport.status === "fulfilled" ? healthReport.value : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Tableau de bord</h1>
          <p className="muted">
            Données agrégées par la passerelle Next.js : <code>GET /api/dashboard</code> et <code>GET /api/health</code>.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => void load()} disabled={loading}>
          {loading ? "Actualisation…" : "Actualiser"}
        </button>
      </header>

      <HealthStrip health={health} loading={loading} />

      {error ? (
        <div className="notice notice-error" role="alert">
          <span className="notice-icon" aria-hidden="true">
            !
          </span>
          <p>{error}</p>
        </div>
      ) : null}

      {data ? (
        <>
          <section className="card hero-card" aria-label="Chiffre d'affaires">
            <span className="stat-label">Chiffre d&apos;affaires</span>
            <span className="hero-value">{formatCurrency(data.orders.revenue)}</span>
            <span className="muted">
              {data.orders.billableOrders} commandes facturées · hors commandes annulées
            </span>
          </section>

          <section className="stat-grid" aria-label="Indicateurs clés">
            <StatTile label="Utilisateurs" value={data.users.total} hint={`${data.users.inactive} inactif(s)`} />
            <StatTile
              label="Utilisateurs actifs"
              value={data.users.active}
              hint={`${Math.round((data.users.active / Math.max(1, data.users.total)) * 100)} % du total`}
            />
            <StatTile label="Commandes" value={data.orders.total} hint={`${data.orders.byStatus.pending} en attente`} />
            <StatTile label="Panier moyen" value={formatCurrency(data.orders.averageOrderValue)} hint="Commandes facturées" />
          </section>

          <div className="chart-grid">
            <section className="card">
              <h2>Commandes par statut</h2>
              <BarList
                label="Nombre de commandes par statut"
                unit="commande(s)"
                data={ORDER_STATUSES.map((status) => ({
                  key: status,
                  label: ORDER_STATUS_LABELS[status],
                  value: data.orders.byStatus[status],
                }))}
              />
            </section>
            <section className="card">
              <h2>Utilisateurs par rôle</h2>
              <BarList
                label="Nombre d'utilisateurs par rôle"
                unit="utilisateur(s)"
                data={USER_ROLES.map((role) => ({ key: role, label: ROLE_LABELS[role], value: data.users.byRole[role] }))}
              />
            </section>
          </div>

          <section className="card">
            <div className="card-header">
              <h2>Dernières commandes</h2>
              <Link href="/orders" className="link">
                Gérer les commandes →
              </Link>
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
                  </tr>
                </thead>
                <tbody>
                  {data.orders.recent.map((order) => (
                    <tr key={order.id}>
                      <td className="num-id">#{order.id}</td>
                      <td>Utilisateur #{order.userId}</td>
                      <td>{order.items.map((item) => item.product).join(", ")}</td>
                      <td className="num">{formatCurrency(order.total)}</td>
                      <td>
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td>{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : loading ? (
        <p className="muted">Chargement des statistiques…</p>
      ) : null}
    </>
  );
}
