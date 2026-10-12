import type { Request, Response } from "express";
import * as ordersService from "../services/orders.service.js";
import type { CreateOrderInput, OrderStatus } from "../types.js";

type OrderIdParams = { id: string };

/** GET /api/orders?status=&limit= */
export function listOrders(_req: Request, res: Response): void {
  const orders = ordersService.findOrders(res.locals.orderFilters ?? {});
  res.json({ data: orders, meta: { count: orders.length } });
}

/** GET /api/orders/:id */
export function getOrderById(req: Request<OrderIdParams>, res: Response): void {
  res.json({ data: ordersService.findOrderById(Number(req.params.id)) });
}

/** POST /api/orders : vérifie l'utilisateur via users-service avant la création. */
export async function createOrder(
  req: Request<Record<string, string>, unknown, CreateOrderInput>,
  res: Response,
): Promise<void> {
  const order = await ordersService.createOrder(req.body);
  res.status(201).location(`/api/orders/${order.id}`).json({ data: order });
}

/** PATCH /api/orders/:id/status */
export function updateOrderStatus(req: Request<OrderIdParams, unknown, { status: OrderStatus }>, res: Response): void {
  const order = ordersService.updateOrderStatus(Number(req.params.id), req.body.status);
  res.json({ data: order });
}

/** DELETE /api/orders/:id */
export function deleteOrder(req: Request<OrderIdParams>, res: Response): void {
  ordersService.deleteOrder(Number(req.params.id));
  res.status(204).end();
}

/** GET /api/orders/by-user/:userId */
export function listOrdersByUser(req: Request<{ userId: string }>, res: Response): void {
  const userId = Number(req.params.userId);
  const orders = ordersService.findOrdersByUser(userId);
  res.json({ data: orders, meta: { userId, count: orders.length } });
}
