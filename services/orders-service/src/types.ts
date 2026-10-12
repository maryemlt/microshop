export const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Une commande livrée ou annulée ne peut plus changer de statut. */
export const FINAL_ORDER_STATUSES: readonly OrderStatus[] = ["delivered", "cancelled"];

export interface OrderItem {
  product: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: number;
  userId: number;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  userId: number;
  items: OrderItem[];
}

export interface OrderFilters {
  status?: OrderStatus;
  limit?: number;
}

/** Sous-ensemble de la ressource renvoyée par GET /api/users/:id (users-service). */
export interface RemoteUser {
  id: number;
  name: string;
  email: string;
  status: "active" | "inactive";
}

declare global {
  namespace Express {
    interface Locals {
      /** Filtres validés par validateListOrdersQuery. */
      orderFilters?: OrderFilters;
    }
  }
}
