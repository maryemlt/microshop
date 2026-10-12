import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getDashboard } from "../app/api/dashboard/route";
import { GET as getOrderDetail } from "../app/api/gateway/orders/[id]/route";
import { GET as getUserDetail } from "../app/api/gateway/users/[id]/route";
import { GET as getHealth } from "../app/api/health/route";
import type { Order, User, UserStats } from "../lib/types";

const USERS_URL = "http://users-service.test";
const ORDERS_URL = "http://orders-service.test";

const users: User[] = [
  {
    id: 1,
    name: "Amina Benali",
    email: "amina.benali@microshop.test",
    role: "admin",
    status: "active",
    createdAt: "2026-01-05T09:00:00.000Z",
    updatedAt: "2026-01-05T09:00:00.000Z",
  },
];

const orders: Order[] = [
  {
    id: 10,
    userId: 1,
    items: [{ product: "Clavier", quantity: 2, unitPrice: 50 }],
    total: 100,
    status: "paid",
    createdAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-05-01T10:00:00.000Z",
  },
  {
    id: 11,
    userId: 1,
    items: [{ product: "Écran", quantity: 1, unitPrice: 200 }],
    total: 200,
    status: "cancelled",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
  },
  {
    id: 12,
    userId: 99,
    items: [{ product: "Souris", quantity: 1, unitPrice: 25.5 }],
    total: 25.5,
    status: "pending",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
  },
];

const userStats: UserStats = { total: 1, active: 1, inactive: 0, byRole: { admin: 1, manager: 0, customer: 0 } };

const down = new Set<string>();

const notFound = () => Response.json({ error: { code: "NOT_FOUND", message: "Ressource introuvable." } }, { status: 404 });

/** Faux microservices : toute URL hors des deux origines simulées fait échouer le test. */
async function fakeServices(input: string | URL | Request): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : input);
  if (down.has(url.origin)) throw new TypeError("fetch failed");

  if (url.origin === USERS_URL) {
    if (url.pathname === "/health/users") return Response.json({ status: "ok" });
    if (url.pathname === "/api/users/stats") return Response.json({ data: userStats });
    const user = users.find((candidate) => url.pathname === `/api/users/${candidate.id}`);
    return user ? Response.json({ data: user }) : notFound();
  }

  if (url.origin === ORDERS_URL) {
    if (url.pathname === "/health/orders") return Response.json({ status: "ok" });
    if (url.pathname === "/api/orders") return Response.json({ data: orders, meta: { count: orders.length } });
    const byUser = url.pathname.match(/^\/api\/orders\/by-user\/(\d+)$/);
    if (byUser) {
      const list = orders.filter((order) => order.userId === Number(byUser[1]));
      return Response.json({ data: list, meta: { count: list.length } });
    }
    const order = orders.find((candidate) => url.pathname === `/api/orders/${candidate.id}`);
    return order ? Response.json({ data: order }) : notFound();
  }

  throw new Error(`Appel externe inattendu : ${url.href}`);
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const request = (path: string) => new Request(`http://localhost:3000${path}`);

beforeEach(() => {
  down.clear();
  vi.stubEnv("USERS_SERVICE_URL", USERS_URL);
  vi.stubEnv("ORDERS_SERVICE_URL", ORDERS_URL);
  vi.spyOn(globalThis, "fetch").mockImplementation(fakeServices);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("GET /api/dashboard", () => {
  it("agrège les statistiques des deux microservices", async () => {
    const res = await getDashboard();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.users).toEqual(userStats);
    expect(body.data.orders).toMatchObject({
      total: 3,
      revenue: 125.5,
      billableOrders: 2,
      averageOrderValue: 62.75,
      byStatus: { pending: 1, paid: 1, shipped: 0, delivered: 0, cancelled: 1 },
    });
    expect(body.data.orders.recent.map((order: Order) => order.id)).toEqual([12, 11, 10]);
  });

  it("renvoie 502 si orders-service est injoignable", async () => {
    down.add(ORDERS_URL);

    const res = await getDashboard();
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toMatchObject({ code: "SERVICE_UNAVAILABLE", service: "orders-service" });
  });
});

describe("GET /api/health", () => {
  it("renvoie 200 quand les deux services répondent", async () => {
    const res = await getHealth();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.services["users-service"].status).toBe("up");
    expect(body.services["orders-service"].status).toBe("up");
  });

  it("renvoie 503 (dégradé) si un service est arrêté", async () => {
    down.add(USERS_URL);

    const res = await getHealth();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.services["users-service"]).toMatchObject({ status: "down", error: "Service injoignable" });
    expect(body.services["orders-service"].status).toBe("up");
  });
});

describe("GET /api/gateway/users/[id]", () => {
  it("combine l'utilisateur et ses commandes", async () => {
    const res = await getUserDetail(request("/api/gateway/users/1"), params("1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.user.name).toBe("Amina Benali");
    expect(body.data.orders.map((order: Order) => order.id)).toEqual([10, 11]);
    expect(body.data.totalSpent).toBe(100);
  });

  it("relaie le 404 de users-service", async () => {
    const res = await getUserDetail(request("/api/gateway/users/404"), params("404"));

    expect(res.status).toBe(404);
  });

  it("renvoie 400 pour un segment [id] invalide sans appeler les services", async () => {
    const res = await getUserDetail(request("/api/gateway/users/abc"), params("abc"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("INVALID_ID");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("GET /api/gateway/orders/[id]", () => {
  it("enrichit la commande avec son utilisateur", async () => {
    const res = await getOrderDetail(request("/api/gateway/orders/10"), params("10"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.order.id).toBe(10);
    expect(body.data.user.email).toBe("amina.benali@microshop.test");
  });

  it("renvoie user: null si l'utilisateur n'existe plus", async () => {
    const res = await getOrderDetail(request("/api/gateway/orders/12"), params("12"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.user).toBeNull();
  });

  it("relaie le 404 d'orders-service", async () => {
    const res = await getOrderDetail(request("/api/gateway/orders/999"), params("999"));

    expect(res.status).toBe(404);
  });

  it("renvoie 400 pour un segment [id] invalide", async () => {
    const res = await getOrderDetail(request("/api/gateway/orders/0"), params("0"));

    expect(res.status).toBe(400);
  });
});
