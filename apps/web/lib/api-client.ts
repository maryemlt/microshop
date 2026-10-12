import { publicServiceUrls } from "./config";
import type {
  ApiErrorBody,
  DashboardData,
  DataResponse,
  HealthReport,
  ListResponse,
  NewOrderInput,
  Order,
  OrderDetail,
  OrderStatus,
  User,
  UserDetail,
  UserInput,
  UserStats,
} from "./types";

/**
 * Client HTTP du navigateur.
 * - usersApi / ordersApi appellent directement les microservices Express (CORS).
 * - gatewayApi appelle les Route Handlers de la passerelle Next.js (même origine).
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, string> | undefined;

  constructor(status: number, code: string, message: string, details?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function send(url: string, init: RequestInit = {}): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", ...init });
  } catch {
    const target = new URL(url, window.location.origin).origin;
    throw new ApiError(0, "NETWORK_ERROR", `Impossible de joindre ${target}. Le service est-il démarré ?`);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as Partial<ApiErrorBody> | null;
    throw new ApiError(
      response.status,
      body?.error?.code ?? "HTTP_ERROR",
      body?.error?.message ?? `Erreur HTTP ${response.status}.`,
      body?.error?.details,
    );
  }
  return response;
}

async function getJson<T>(url: string): Promise<T> {
  return (await (await send(url)).json()) as T;
}

async function sendJson<T>(url: string, method: "POST" | "PATCH", body: unknown): Promise<T> {
  const response = await send(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await response.json()) as T;
}

function withQuery(url: string, params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const queryString = query.toString();
  return queryString ? `${url}?${queryString}` : url;
}

const USERS_API = `${publicServiceUrls.users}/api/users`;
const ORDERS_API = `${publicServiceUrls.orders}/api/orders`;

export interface UserListFilters {
  search?: string;
  role?: string;
  status?: string;
}

export const usersApi = {
  list: (filters: UserListFilters = {}) => getJson<ListResponse<User>>(withQuery(USERS_API, { ...filters })),
  stats: () => getJson<DataResponse<UserStats>>(`${USERS_API}/stats`),
  create: (input: UserInput) => sendJson<DataResponse<User>>(USERS_API, "POST", input),
  update: (id: number, changes: Partial<UserInput>) => sendJson<DataResponse<User>>(`${USERS_API}/${id}`, "PATCH", changes),
  remove: async (id: number): Promise<void> => {
    await send(`${USERS_API}/${id}`, { method: "DELETE" });
  },
};

export const ordersApi = {
  list: (status?: OrderStatus) => getJson<ListResponse<Order>>(withQuery(ORDERS_API, { status })),
  listByUser: (userId: number) => getJson<ListResponse<Order>>(`${ORDERS_API}/by-user/${userId}`),
  create: (input: NewOrderInput) => sendJson<DataResponse<Order>>(ORDERS_API, "POST", input),
  updateStatus: (id: number, status: OrderStatus) =>
    sendJson<DataResponse<Order>>(`${ORDERS_API}/${id}/status`, "PATCH", { status }),
  remove: async (id: number): Promise<void> => {
    await send(`${ORDERS_API}/${id}`, { method: "DELETE" });
  },
};

export const gatewayApi = {
  dashboard: () => getJson<DataResponse<DashboardData>>("/api/dashboard"),
  /** 200 et 503 renvoient tous deux un HealthReport. */
  health: async (): Promise<HealthReport> => {
    try {
      return (await (await fetch("/api/health", { cache: "no-store" })).json()) as HealthReport;
    } catch {
      throw new ApiError(0, "NETWORK_ERROR", "La passerelle Next.js ne répond pas.");
    }
  },
  user: (id: number) => getJson<DataResponse<UserDetail>>(`/api/gateway/users/${id}`),
  order: (id: number) => getJson<DataResponse<OrderDetail>>(`/api/gateway/orders/${id}`),
};

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erreur inattendue.";
}
