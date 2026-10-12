import express from "express";
import { usersRouter } from "./users.routes.js";

/** Routeur racine de l'API, monté sur /api dans app.ts. */
export const apiRouter = express.Router();

apiRouter.use("/users", usersRouter);
