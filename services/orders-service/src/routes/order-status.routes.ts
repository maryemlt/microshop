import { Router } from "express";
import { updateOrderStatus } from "../controllers/orders.controller.js";
import { validateIntegerParam, validateOrderStatus } from "../middleware/validation.js";

/**
 * Routeur imbriqué, monté sur "/:id/status" par ordersRouter.
 * mergeParams donne accès au paramètre :id défini par le routeur parent.
 */
export const orderStatusRouter = Router({ mergeParams: true });

orderStatusRouter.patch("/", validateIntegerParam("id"), validateOrderStatus, updateOrderStatus);
