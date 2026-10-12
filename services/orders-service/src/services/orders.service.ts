import { ordersStore } from "../data/orders.data.js";
import { HttpError } from "../errors.js";
import { FINAL_ORDER_STATUSES, type CreateOrderInput, type Order, type OrderFilters, type OrderStatus } from "../types.js";
import { fetchUser } from "./users.client.js";

function orderNotFound(id: number): HttpError {
  return new HttpError(404, "ORDER_NOT_FOUND", `Commande ${id} introuvable.`);
}

export function calculateOrderTotal(items: CreateOrderInput["items"]): number {
  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return Math.round(total * 100) / 100;
}

export function findOrders(filters: OrderFilters): Order[] {
  const orders = ordersStore.orders.filter((order) => !filters.status || order.status === filters.status);
  return filters.limit ? orders.slice(0, filters.limit) : orders;
}

export function findOrderById(id: number): Order {
  const order = ordersStore.orders.find((candidate) => candidate.id === id);
  if (!order) throw orderNotFound(id);
  return order;
}

export function findOrdersByUser(userId: number): Order[] {
  return ordersStore.orders.filter((order) => order.userId === userId);
}

/** Crée une commande après avoir vérifié l'utilisateur auprès de users-service. */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const user = await fetchUser(input.userId);
  if (!user) {
    throw new HttpError(422, "USER_NOT_FOUND", `L'utilisateur ${input.userId} n'existe pas dans users-service.`);
  }
  if (user.status !== "active") {
    throw new HttpError(422, "USER_INACTIVE", `L'utilisateur ${user.name} est inactif et ne peut pas commander.`);
  }

  const now = new Date().toISOString();
  const order: Order = {
    id: ordersStore.nextId++,
    userId: input.userId,
    items: input.items,
    total: calculateOrderTotal(input.items),
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  ordersStore.orders.push(order);
  return order;
}

export function updateOrderStatus(id: number, status: OrderStatus): Order {
  const order = findOrderById(id);
  if (order.status !== status && FINAL_ORDER_STATUSES.includes(order.status)) {
    throw new HttpError(409, "ORDER_STATUS_LOCKED", `La commande ${id} est « ${order.status} » : son statut ne peut plus changer.`);
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();
  return order;
}

export function deleteOrder(id: number): void {
  const index = ordersStore.orders.findIndex((order) => order.id === id);
  if (index === -1) throw orderNotFound(id);
  ordersStore.orders.splice(index, 1);
}
