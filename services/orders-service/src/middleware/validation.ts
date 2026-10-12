import type { NextFunction, Request, RequestHandler, Response } from "express";
import { HttpError } from "../errors.js";
import { ORDER_STATUSES, type CreateOrderInput, type OrderFilters, type OrderItem, type OrderStatus } from "../types.js";

type FieldErrors = Record<string, string>;

const POSITIVE_INTEGER = /^[1-9]\d*$/;
const MAX_ITEMS = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

function validationError(errors: FieldErrors): HttpError {
  return new HttpError(400, "VALIDATION_ERROR", "Les données envoyées sont invalides.", errors);
}

/** Fabrique un middleware vérifiant qu'un paramètre de chemin est un entier positif. */
export function validateIntegerParam(name: string): RequestHandler {
  return (req, _res, next) => {
    const value = req.params[name];
    if (typeof value !== "string" || !POSITIVE_INTEGER.test(value)) {
      next(new HttpError(400, "INVALID_PARAM", `Le paramètre « ${name} » doit être un entier positif.`));
      return;
    }
    next();
  };
}

/** Valide ?status=&limit= pour GET /api/orders. */
export function validateListOrdersQuery(req: Request, res: Response, next: NextFunction): void {
  const { status, limit } = req.query;
  const errors: FieldErrors = {};
  const filters: OrderFilters = {};

  if (status !== undefined) {
    if (isOrderStatus(status)) filters.status = status;
    else errors.status = `Valeurs autorisées : ${ORDER_STATUSES.join(", ")}.`;
  }
  if (limit !== undefined) {
    if (typeof limit === "string" && POSITIVE_INTEGER.test(limit) && Number(limit) <= 100) filters.limit = Number(limit);
    else errors.limit = "Le paramètre limit doit être un entier entre 1 et 100.";
  }

  if (Object.keys(errors).length > 0) {
    next(validationError(errors));
    return;
  }
  res.locals.orderFilters = filters;
  next();
}

function readItem(raw: unknown, index: number, errors: FieldErrors): OrderItem | undefined {
  const prefix = `items[${index}]`;
  if (!isRecord(raw)) {
    errors[prefix] = "Chaque article doit être un objet.";
    return undefined;
  }

  const { product, quantity, unitPrice } = raw;
  const validProduct = typeof product === "string" && product.trim().length >= 2 ? product.trim() : undefined;
  const validQuantity =
    typeof quantity === "number" && Number.isInteger(quantity) && quantity >= 1 && quantity <= 99 ? quantity : undefined;
  const validUnitPrice =
    typeof unitPrice === "number" && Number.isFinite(unitPrice) && unitPrice > 0 && unitPrice <= 10_000
      ? Math.round(unitPrice * 100) / 100
      : undefined;

  if (validProduct === undefined) errors[`${prefix}.product`] = "Le nom du produit doit contenir au moins 2 caractères.";
  if (validQuantity === undefined) errors[`${prefix}.quantity`] = "La quantité doit être un entier entre 1 et 99.";
  if (validUnitPrice === undefined) errors[`${prefix}.unitPrice`] = "Le prix unitaire doit être compris entre 0 et 10 000.";

  if (validProduct === undefined || validQuantity === undefined || validUnitPrice === undefined) return undefined;
  return { product: validProduct, quantity: validQuantity, unitPrice: validUnitPrice };
}

/** Valide le corps JSON de POST /api/orders. */
export function validateCreateOrder(req: Request, _res: Response, next: NextFunction): void {
  if (!isRecord(req.body)) {
    next(new HttpError(400, "INVALID_BODY", "Le corps de la requête doit être un objet JSON."));
    return;
  }

  const { userId, items } = req.body;
  const errors: FieldErrors = {};

  const validUserId = typeof userId === "number" && Number.isInteger(userId) && userId >= 1 ? userId : undefined;
  if (validUserId === undefined) errors.userId = "userId doit être un entier positif.";

  const validItems: OrderItem[] = [];
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
    errors.items = `items doit être une liste de 1 à ${MAX_ITEMS} articles.`;
  } else {
    items.forEach((raw, index) => {
      const item = readItem(raw, index, errors);
      if (item) validItems.push(item);
    });
  }

  if (validUserId === undefined || Object.keys(errors).length > 0) {
    next(validationError(errors));
    return;
  }
  req.body = { userId: validUserId, items: validItems } satisfies CreateOrderInput;
  next();
}

/** Valide le corps JSON de PATCH /api/orders/:id/status. */
export function validateOrderStatus(req: Request, _res: Response, next: NextFunction): void {
  const status: unknown = isRecord(req.body) ? req.body.status : undefined;
  if (!isOrderStatus(status)) {
    next(validationError({ status: `Valeurs autorisées : ${ORDER_STATUSES.join(", ")}.` }));
    return;
  }
  req.body = { status };
  next();
}
