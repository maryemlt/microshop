import { Router } from "express";
import {
  createOrder,
  deleteOrder,
  getOrderById,
  listOrders,
  listOrdersByUser,
} from "../controllers/orders.controller.js";
import { validateCreateOrder, validateIntegerParam, validateListOrdersQuery } from "../middleware/validation.js";
import { orderStatusRouter } from "./order-status.routes.js";

/** Monté sur /api/orders dans app.ts. */
export const ordersRouter = Router();

ordersRouter
  .route("/")
  .get(validateListOrdersQuery, listOrders)
  .post(validateCreateOrder, createOrder);

ordersRouter.get("/by-user/:userId", validateIntegerParam("userId"), listOrdersByUser);

ordersRouter.use("/:id/status", orderStatusRouter);

ordersRouter
  .route("/:id")
  .get(validateIntegerParam("id"), getOrderById)
  .delete(validateIntegerParam("id"), deleteOrder);
