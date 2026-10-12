import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errors.js";
import {
  USER_ROLES,
  USER_STATUSES,
  type CreateUserInput,
  type UpdateUserInput,
  type UserFilters,
} from "../types.js";

type FieldErrors = Record<string, string>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_FIELDS = ["name", "email", "role", "status"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(allowed: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function validationError(errors: FieldErrors): HttpError {
  return new HttpError(400, "VALIDATION_ERROR", "Les données envoyées sont invalides.", errors);
}

/** Lit et valide les champs utilisateur présents dans le corps JSON. */
function readUserFields(body: Record<string, unknown>, errors: FieldErrors): UpdateUserInput {
  const input: UpdateUserInput = {};

  for (const field of Object.keys(body)) {
    if (!USER_FIELDS.includes(field)) errors[field] = "Champ non reconnu.";
  }

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length < 2) {
      errors.name = "Le nom doit contenir au moins 2 caractères.";
    } else {
      input.name = body.name.trim();
    }
  }
  if (body.email !== undefined) {
    if (typeof body.email !== "string" || !EMAIL_PATTERN.test(body.email.trim())) {
      errors.email = "L'adresse e-mail est invalide.";
    } else {
      input.email = body.email.trim().toLowerCase();
    }
  }
  if (body.role !== undefined) {
    if (isOneOf(USER_ROLES, body.role)) input.role = body.role;
    else errors.role = `Valeurs autorisées : ${USER_ROLES.join(", ")}.`;
  }
  if (body.status !== undefined) {
    if (isOneOf(USER_STATUSES, body.status)) input.status = body.status;
    else errors.status = `Valeurs autorisées : ${USER_STATUSES.join(", ")}.`;
  }
  return input;
}

/** Callback router.param("id") : l'identifiant doit être un entier positif. */
export function validateUserIdParam(_req: Request, _res: Response, next: NextFunction, value: string): void {
  if (!/^[1-9]\d*$/.test(value)) {
    next(new HttpError(400, "INVALID_ID", `L'identifiant « ${value} » doit être un entier positif.`));
    return;
  }
  next();
}

/** Valide les paramètres de requête de GET /api/users. */
export function validateListUsersQuery(req: Request, res: Response, next: NextFunction): void {
  const { search, role, status } = req.query;
  const errors: FieldErrors = {};
  const filters: UserFilters = {};

  if (search !== undefined) {
    if (typeof search !== "string") errors.search = "Le paramètre search doit être une chaîne.";
    else if (search.trim()) filters.search = search.trim();
  }
  if (role !== undefined) {
    if (isOneOf(USER_ROLES, role)) filters.role = role;
    else errors.role = `Valeurs autorisées : ${USER_ROLES.join(", ")}.`;
  }
  if (status !== undefined) {
    if (isOneOf(USER_STATUSES, status)) filters.status = status;
    else errors.status = `Valeurs autorisées : ${USER_STATUSES.join(", ")}.`;
  }

  if (Object.keys(errors).length > 0) {
    next(validationError(errors));
    return;
  }
  res.locals.userFilters = filters;
  next();
}

/** Valide le corps JSON de POST /api/users ; role et status ont des valeurs par défaut. */
export function validateCreateUser(req: Request, _res: Response, next: NextFunction): void {
  if (!isRecord(req.body)) {
    next(new HttpError(400, "INVALID_BODY", "Le corps de la requête doit être un objet JSON."));
    return;
  }

  const errors: FieldErrors = {};
  const { name, email, role = "customer", status = "active" } = readUserFields(req.body, errors);
  if (name === undefined) errors.name ??= "Le nom est obligatoire.";
  if (email === undefined) errors.email ??= "L'adresse e-mail est obligatoire.";

  if (name === undefined || email === undefined || Object.keys(errors).length > 0) {
    next(validationError(errors));
    return;
  }
  req.body = { name, email, role, status } satisfies CreateUserInput;
  next();
}

/** Valide le corps JSON de PATCH /api/users/:id (au moins un champ). */
export function validateUpdateUser(req: Request, _res: Response, next: NextFunction): void {
  if (!isRecord(req.body)) {
    next(new HttpError(400, "INVALID_BODY", "Le corps de la requête doit être un objet JSON."));
    return;
  }

  const errors: FieldErrors = {};
  const changes = readUserFields(req.body, errors);
  if (Object.keys(errors).length > 0) {
    next(validationError(errors));
    return;
  }
  if (Object.keys(changes).length === 0) {
    next(new HttpError(400, "EMPTY_UPDATE", "Aucun champ à modifier (name, email, role, status)."));
    return;
  }
  req.body = changes;
  next();
}
