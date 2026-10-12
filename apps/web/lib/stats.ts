import type { Order, OrderStats, OrderStatus } from "./types";

const roundCents = (value: number): number => Math.round(value * 100) / 100;

/** Somme des commandes non annulées. */
export function sumBillable(orders: Order[]): number {
  return roundCents(orders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + order.total, 0));
}

/** Statistiques de commandes calculées par la passerelle (orders-service n'expose pas de route de statistiques). */
export function buildOrderStats(orders: Order[]): OrderStats {
  const byStatus: Record<OrderStatus, number> = { pending: 0, paid: 0, shipped: 0, delivered: 0, cancelled: 0 };
  for (const order of orders) byStatus[order.status] += 1;

  const billableOrders = orders.length - byStatus.cancelled;
  const revenue = sumBillable(orders);
  const recent = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return {
    total: orders.length,
    revenue,
    billableOrders,
    averageOrderValue: billableOrders > 0 ? roundCents(revenue / billableOrders) : 0,
    byStatus,
    recent,
  };
}
