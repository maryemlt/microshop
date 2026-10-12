import type { Request, Response } from "express";
import { ordersStore } from "../data/orders.data.js";

/** GET /health/orders */
export function getHealth(_req: Request, res: Response): void {
  res.json({
    service: "orders-service",
    status: "ok",
    orders: ordersStore.orders.length,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
