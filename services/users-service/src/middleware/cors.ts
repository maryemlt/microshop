import type { RequestHandler } from "express";

const DEFAULT_ALLOWED_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000";

/** Autorise le frontend Next.js (WEB_ORIGIN) à appeler le service depuis le navigateur. */
export const corsMiddleware: RequestHandler = (req, res, next) => {
  const allowedOrigins = (process.env.WEB_ORIGIN ?? DEFAULT_ALLOWED_ORIGINS).split(",").map((origin) => origin.trim());
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
};
