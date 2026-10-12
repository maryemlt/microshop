import { NextResponse } from "next/server";
import { getUpstreamUrls } from "./config";
import type { ApiErrorBody, DataResponse, ListResponse, Order, ServiceHealth, ServiceName, User, UserStats } from "./types";

/**
 * Client HTTP serveur de la passerelle Next.js vers users-service et orders-service.
 * Utilisé uniquement par les Route Handlers de app/api.
 */

const REQUEST_TIMEOUT_MS = 3000;

export class UpstreamError extends Error {
  readonly service: ServiceName;
  readonly status: number;
  readonly code: string;

  constructor(service: ServiceName, status: number, code: string, message: string) {
    super(message);
    this.name = "UpstreamError";
    this.service = service;
    this.status = status;
    this.code = code;
  }
}

function baseUrl(service: ServiceName): string {
  const urls = getUpstreamUrls();
  return service === "users-service" ? urls.users : urls.orders;
}

async function readUpstreamError(response: Response): Promise<ApiErrorBody["error"] | undefined> {
  try {
    return ((await response.json()) as Partial<ApiErrorBody>).error;
  } catch {
    return undefined;
  }
}

async function getJson<T>(service: ServiceName, path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl(service)}${path}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new UpstreamError(service, 502, "SERVICE_UNAVAILABLE", `${service} est injoignable.`);
  }

  if (!response.ok) {
    const error = await readUpstreamError(response);
    // Les erreurs client (4xx) sont relayées telles quelles ; les erreurs serveur deviennent 502.
    const status = response.status < 500 ? response.status : 502;
    throw new UpstreamError(
      service,
      status,
      error?.code ?? "UPSTREAM_ERROR",
      error?.message ?? `${service} a répondu HTTP ${response.status}.`,
    );
  }
  return (await response.json()) as T;
}

export async function fetchUserStats(): Promise<UserStats> {
  return (await getJson<DataResponse<UserStats>>("users-service", "/api/users/stats")).data;
}

export async function fetchUser(id: number): Promise<User> {
  return (await getJson<DataResponse<User>>("users-service", `/api/users/${id}`)).data;
}

/** Comme fetchUser, mais renvoie null si l'utilisateur n'existe plus. */
export async function findUser(id: number): Promise<User | null> {
  try {
    return await fetchUser(id);
  } catch (error) {
    if (error instanceof UpstreamError && error.status === 404) return null;
    throw error;
  }
}

export async function fetchOrders(): Promise<Order[]> {
  return (await getJson<ListResponse<Order>>("orders-service", "/api/orders")).data;
}

export async function fetchOrder(id: number): Promise<Order> {
  return (await getJson<DataResponse<Order>>("orders-service", `/api/orders/${id}`)).data;
}

export async function fetchOrdersByUser(userId: number): Promise<Order[]> {
  return (await getJson<ListResponse<Order>>("orders-service", `/api/orders/by-user/${userId}`)).data;
}

const HEALTH_PATHS: Record<ServiceName, string> = {
  "users-service": "/health/users",
  "orders-service": "/health/orders",
};

export async function checkHealth(service: ServiceName): Promise<ServiceHealth> {
  const startedAt = performance.now();
  const elapsed = () => Math.round(performance.now() - startedAt);
  try {
    const response = await fetch(`${baseUrl(service)}${HEALTH_PATHS[service]}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return response.ok
      ? { status: "up", latencyMs: elapsed(), httpStatus: response.status }
      : { status: "down", latencyMs: elapsed(), httpStatus: response.status, error: `HTTP ${response.status}` };
  } catch {
    return { status: "down", latencyMs: elapsed(), error: "Service injoignable" };
  }
}

/** Valide un segment dynamique [id] : entier strictement positif, sinon null. */
export function parseId(value: string): number | null {
  return /^[1-9]\d*$/.test(value) ? Number(value) : null;
}

export function errorResponse(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof UpstreamError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, service: error.service } },
      { status: error.status },
    );
  }
  console.error("[gateway]", error);
  return errorResponse(500, "GATEWAY_ERROR", "Erreur interne de la passerelle.");
}
