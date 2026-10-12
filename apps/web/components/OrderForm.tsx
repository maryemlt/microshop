"use client";

import { useState, type FormEvent } from "react";
import { formatCurrency } from "@/lib/format";
import type { NewOrderInput, User } from "@/lib/types";

type FieldErrors = Record<string, string>;
type ItemDraft = { product: string; quantity: string; unitPrice: string };

const EMPTY_ITEM: ItemDraft = { product: "", quantity: "1", unitPrice: "" };

interface OrderFormProps {
  users: User[];
  /** Renvoie les erreurs de champ de l'API, ou undefined en cas de succès. */
  onSubmit: (input: NewOrderInput) => Promise<FieldErrors | undefined>;
}

export function OrderForm({ users, onSubmit }: OrderFormProps) {
  const [userId, setUserId] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([{ ...EMPTY_ITEM }]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const previewTotal = items.reduce((sum, item) => {
    const lineTotal = Number(item.quantity) * Number(item.unitPrice);
    return Number.isFinite(lineTotal) ? sum + lineTotal : sum;
  }, 0);

  function updateItem(index: number, field: keyof ItemDraft, value: string) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) {
      setErrors({ userId: "Choisissez un utilisateur." });
      return;
    }

    setSubmitting(true);
    const fieldErrors = await onSubmit({
      userId: Number(userId),
      items: items.map((item) => ({
        product: item.product,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
    });
    setSubmitting(false);
    setErrors(fieldErrors ?? {});
    if (!fieldErrors) {
      setUserId("");
      setItems([{ ...EMPTY_ITEM }]);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span>Utilisateur</span>
        <select value={userId} onChange={(event) => setUserId(event.target.value)} aria-invalid={Boolean(errors.userId)}>
          <option value="">Sélectionner…</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              #{user.id} · {user.name}
              {user.status === "inactive" ? " (inactif)" : ""}
            </option>
          ))}
        </select>
        {errors.userId ? <small className="field-error">{errors.userId}</small> : null}
      </label>

      <fieldset className="items">
        <legend>Articles</legend>
        {items.map((item, index) => (
          <div className="item-row" key={index}>
            <input
              value={item.product}
              onChange={(event) => updateItem(index, "product", event.target.value)}
              placeholder="Produit"
              aria-label={`Produit de l'article ${index + 1}`}
            />
            <input
              type="number"
              min={1}
              max={99}
              value={item.quantity}
              onChange={(event) => updateItem(index, "quantity", event.target.value)}
              aria-label={`Quantité de l'article ${index + 1}`}
            />
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={item.unitPrice}
              onChange={(event) => updateItem(index, "unitPrice", event.target.value)}
              placeholder="Prix €"
              aria-label={`Prix unitaire de l'article ${index + 1}`}
            />
            <button
              type="button"
              className="btn-icon"
              onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
              disabled={items.length === 1}
              aria-label={`Retirer l'article ${index + 1}`}
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setItems((current) => [...current, { ...EMPTY_ITEM }])}>
          + Ajouter un article
        </button>
      </fieldset>

      {Object.keys(errors).some((key) => key !== "userId") ? (
        <ul className="error-list">
          {Object.entries(errors)
            .filter(([key]) => key !== "userId")
            .map(([key, message]) => (
              <li key={key}>
                <code>{key}</code> {message}
              </li>
            ))}
        </ul>
      ) : null}

      <div className="form-actions">
        <span className="total-preview">
          Total estimé <strong>{formatCurrency(previewTotal)}</strong>
        </span>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Création…" : "Créer la commande"}
        </button>
      </div>
    </form>
  );
}
