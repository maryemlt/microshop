import type { OrderStatus, UserRole, UserStatus } from "./types";

const currencyFormat = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

export const formatCurrency = (value: number): string => currencyFormat.format(value);
export const formatDate = (iso: string): string => dateFormat.format(new Date(iso));

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrateur",
  manager: "Gestionnaire",
  customer: "Client",
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: "Actif",
  inactive: "Inactif",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "En attente",
  paid: "Payée",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};
