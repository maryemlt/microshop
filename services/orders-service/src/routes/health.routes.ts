import { Router } from "express";
import { getHealth } from "../controllers/health.controller.js";

/** Monté sur /health dans app.ts : expose GET /health/orders. */
export const healthRouter = Router();

healthRouter.get("/orders", getHealth);
