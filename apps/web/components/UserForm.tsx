"use client";

import { useState, type FormEvent } from "react";
import { ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/format";
import { USER_ROLES, USER_STATUSES, type User, type UserInput } from "@/lib/types";

type FieldErrors = Record<string, string>;

const EMPTY_USER: UserInput = { name: "", email: "", role: "customer", status: "active" };

interface UserFormProps {
  user?: User;
  /** Renvoie les erreurs de champ de l'API, ou undefined en cas de succès. */
  onSubmit: (input: UserInput) => Promise<FieldErrors | undefined>;
  onCancel?: () => void;
}

export function UserForm({ user, onSubmit, onCancel }: UserFormProps) {
  const initial: UserInput = user
    ? { name: user.name, email: user.email, role: user.role, status: user.status }
    : EMPTY_USER;
  const [values, setValues] = useState<UserInput>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof UserInput>(field: K, value: UserInput[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const fieldErrors = await onSubmit(values);
    setSubmitting(false);
    setErrors(fieldErrors ?? {});
    if (!fieldErrors && !user) setValues(EMPTY_USER);
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span>Nom complet</span>
        <input
          value={values.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder="Ex. Nora Petit"
          aria-invalid={Boolean(errors.name)}
          required
        />
        {errors.name ? <small className="field-error">{errors.name}</small> : null}
      </label>

      <label className="field">
        <span>Adresse e-mail</span>
        <input
          type="email"
          value={values.email}
          onChange={(event) => update("email", event.target.value)}
          placeholder="nora.petit@microshop.test"
          aria-invalid={Boolean(errors.email)}
          required
        />
        {errors.email ? <small className="field-error">{errors.email}</small> : null}
      </label>

      <div className="field-row">
        <label className="field">
          <span>Rôle</span>
          <select value={values.role} onChange={(event) => update("role", event.target.value as UserInput["role"])}>
            {USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Statut</span>
          <select
            value={values.status}
            onChange={(event) => update("status", event.target.value as UserInput["status"])}
          >
            {USER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {USER_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-actions">
        {onCancel ? (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Annuler
          </button>
        ) : null}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Enregistrement…" : user ? "Enregistrer les modifications" : "Créer l'utilisateur"}
        </button>
      </div>
    </form>
  );
}
