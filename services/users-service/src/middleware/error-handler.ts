import type { ErrorRequestHandler, RequestHandler } from "express";
import { HttpError } from "../errors.js";

function isJsonParseError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "type" in error && error.type === "entity.parse.failed";
}

/** Dernier middleware « normal » : aucune route n'a répondu. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, "ROUTE_NOT_FOUND", `Aucune route ne correspond à ${req.method} ${req.originalUrl}.`));
};

/** Convertit toute erreur en réponse JSON { error: { code, message, details? } }. */
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, ...(error.details && { details: error.details }) },
    });
    return;
  }
  if (isJsonParseError(error)) {
    res.status(400).json({ error: { code: "INVALID_JSON", message: "Le corps de la requête n'est pas un JSON valide." } });
    return;
  }

  console.error("[users-service]", error);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne du service utilisateurs." } });
};
