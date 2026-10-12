"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, usersApi } from "@/lib/api-client";
import { formatDate, ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/format";
import { USER_ROLES, USER_STATUSES, type User, type UserInput, type UserStats } from "@/lib/types";
import { RoleLabel, UserStatusBadge } from "./Badges";
import { Notice, useNotice } from "./Notice";
import { StatTile } from "./StatTile";
import { UserDetail } from "./UserDetail";
import { UserForm } from "./UserForm";

type Panel = { mode: "create" } | { mode: "edit"; user: User } | { mode: "detail"; userId: number };

/** Champs réellement modifiés, envoyés en PATCH. */
function changedFields(user: User, input: UserInput): Partial<UserInput> {
  const changes: Partial<UserInput> = {};
  if (input.name !== user.name) changes.name = input.name;
  if (input.email !== user.email) changes.email = input.email;
  if (input.role !== user.role) changes.role = input.role;
  if (input.status !== user.status) changes.status = input.status;
  return changes;
}

export function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({ search: "", role: "", status: "" });
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<Panel>({ mode: "create" });
  const [detailVersion, setDetailVersion] = useState(0);
  const { notice, showSuccess, showError, dismiss } = useNotice();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [list, statsResponse] = await Promise.all([usersApi.list(filters), usersApi.stats()]);
      setUsers(list.data);
      setStats(statsResponse.data);
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }, [filters, showError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Recherche différée pour ne pas appeler l'API à chaque frappe.
  useEffect(() => {
    const search = searchInput.trim();
    const timer = setTimeout(() => setFilters((current) => (current.search === search ? current : { ...current, search })), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  async function saveUser(input: UserInput): Promise<Record<string, string> | undefined> {
    try {
      if (panel.mode === "edit") {
        const changes = changedFields(panel.user, input);
        if (Object.keys(changes).length === 0) {
          showSuccess("Aucune modification à enregistrer.");
          return undefined;
        }
        const { data } = await usersApi.update(panel.user.id, changes);
        showSuccess(`Utilisateur « ${data.name} » mis à jour (PATCH : ${Object.keys(changes).join(", ")}).`);
        setPanel({ mode: "detail", userId: data.id });
      } else {
        const { data } = await usersApi.create(input);
        showSuccess(`Utilisateur « ${data.name} » créé avec le n° ${data.id}.`);
      }
      setDetailVersion((version) => version + 1);
      await refresh();
      return undefined;
    } catch (error) {
      showError(error);
      if (!(error instanceof ApiError)) return {};
      return error.code === "EMAIL_ALREADY_USED" ? { email: error.message } : (error.details ?? {});
    }
  }

  async function removeUser(user: User) {
    if (!window.confirm(`Supprimer définitivement ${user.name} ?`)) return;
    try {
      await usersApi.remove(user.id);
      showSuccess(`Utilisateur « ${user.name} » supprimé.`);
      if (panel.mode !== "create" && (panel.mode === "edit" ? panel.user.id : panel.userId) === user.id) {
        setPanel({ mode: "create" });
      }
      await refresh();
    } catch (error) {
      showError(error);
    }
  }

  const panelTitle =
    panel.mode === "create" ? "Nouvel utilisateur" : panel.mode === "edit" ? `Modifier ${panel.user.name}` : "Fiche utilisateur";

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Utilisateurs</h1>
          <p className="muted">
            Appels directs au Users Service (port 4101) : <code>/api/users</code>.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setPanel({ mode: "create" })}>
          + Nouvel utilisateur
        </button>
      </header>

      <Notice notice={notice} onDismiss={dismiss} />

      {stats ? (
        <section className="stat-grid" aria-label="Statistiques des utilisateurs">
          <StatTile label="Total" value={stats.total} />
          <StatTile label="Actifs" value={stats.active} />
          <StatTile label="Inactifs" value={stats.inactive} />
          <StatTile label="Équipe interne" value={stats.byRole.admin + stats.byRole.manager} hint="Administrateurs et gestionnaires" />
        </section>
      ) : null}

      <div className="split">
        <section className="card">
          <div className="filters">
            <input
              type="search"
              placeholder="Rechercher un nom ou un e-mail…"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              aria-label="Rechercher"
            />
            <select
              value={filters.role}
              onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}
              aria-label="Filtrer par rôle"
            >
              <option value="">Tous les rôles</option>
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              aria-label="Filtrer par statut"
            >
              <option value="">Tous les statuts</option>
              {USER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {USER_STATUS_LABELS[status]}
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
                  <th scope="col">Rôle</th>
                  <th scope="col">Statut</th>
                  <th scope="col">Créé le</th>
                  <th scope="col" className="actions">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="num-id">#{user.id}</td>
                    <td>
                      <span className="cell-title">{user.name}</span>
                      <span className="cell-sub">{user.email}</span>
                    </td>
                    <td>
                      <RoleLabel role={user.role} />
                    </td>
                    <td>
                      <UserStatusBadge status={user.status} />
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td className="actions">
                      <div className="row-actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPanel({ mode: "detail", userId: user.id })}>
                          Fiche
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPanel({ mode: "edit", user })}>
                          Modifier
                        </button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => void removeUser(user)}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && users.length === 0 ? <p className="empty">Aucun utilisateur ne correspond aux filtres.</p> : null}
            {loading && users.length === 0 ? <p className="empty">Chargement…</p> : null}
          </div>
        </section>

        <aside className="card panel" aria-label={panelTitle}>
          <div className="card-header">
            <h2>{panelTitle}</h2>
            {panel.mode === "detail" ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const user = users.find((candidate) => candidate.id === panel.userId);
                  if (user) setPanel({ mode: "edit", user });
                }}
              >
                Modifier
              </button>
            ) : null}
          </div>
          {panel.mode === "detail" ? (
            <UserDetail userId={panel.userId} version={detailVersion} />
          ) : (
            <UserForm
              key={panel.mode === "edit" ? `edit-${panel.user.id}` : "create"}
              user={panel.mode === "edit" ? panel.user : undefined}
              onSubmit={saveUser}
              onCancel={panel.mode === "edit" ? () => setPanel({ mode: "create" }) : undefined}
            />
          )}
        </aside>
      </div>
    </>
  );
}
