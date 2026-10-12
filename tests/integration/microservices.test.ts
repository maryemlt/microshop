import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi, type MockInstance } from "vitest";
import { GET as getDashboard } from "../../apps/web/app/api/dashboard/route";
import { GET as getOrderDetail } from "../../apps/web/app/api/gateway/orders/[id]/route";
import { GET as getUserDetail } from "../../apps/web/app/api/gateway/users/[id]/route";
import { GET as getHealth } from "../../apps/web/app/api/health/route";
import { app as ordersApp } from "../../services/orders-service/src/app";
import { app as usersApp } from "../../services/users-service/src/app";

/**
 * Les deux microservices tournent réellement en mémoire sur 127.0.0.1 (ports éphémères) :
 * orders-service et la passerelle Next.js les appellent en HTTP, sans aucun service externe.
 */

interface RunningService {
  server: Server;
  url: string;
}

function start(app: Express): Promise<RunningService> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", (error) => {
      if (error) {
        reject(error);
        return;
      }
      const { port } = server.address() as AddressInfo;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

function stop({ server }: RunningService): Promise<void> {
  return new Promise((resolve) => {
    server.closeAllConnections();
    server.close(() => resolve());
  });
}

const items = [{ product: "Clavier sans fil", quantity: 1, unitPrice: 49.9 }];
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const gatewayRequest = (path: string) => new Request(`http://localhost:3000${path}`);

let users: RunningService;
let orders: RunningService;
let fetchSpy: MockInstance<typeof fetch>;

beforeAll(async () => {
  users = await start(usersApp);
  orders = await start(ordersApp);
  vi.stubEnv("USERS_SERVICE_URL", users.url);
  vi.stubEnv("ORDERS_SERVICE_URL", orders.url);

  // Garde-fou : seuls les services locaux de ce test peuvent être appelés.
  const realFetch = globalThis.fetch;
  fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.hostname !== "127.0.0.1") throw new Error(`Appel externe interdit : ${url.href}`);
    return realFetch(input, init);
  });
});

afterAll(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await Promise.all([users, orders].filter((service) => service.server.listening).map(stop));
});

describe("orders-service → users-service (HTTP)", () => {
  it("crée une commande après vérification de l'utilisateur", async () => {
    const res = await request(ordersApp).post("/api/orders").send({ userId: 2, items });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ id: 9, userId: 2, total: 49.9, status: "pending" });
    expect(fetchSpy).toHaveBeenCalledWith(`${users.url}/api/users/2`, expect.any(Object));
  });

  it("refuse un utilisateur inconnu de users-service (422)", async () => {
    const res = await request(ordersApp).post("/api/orders").send({ userId: 999, items });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("USER_NOT_FOUND");
  });

  it("voit en direct les créations et modifications faites dans users-service", async () => {
    const created = await request(usersApp)
      .post("/api/users")
      .send({ name: "Inès Garnier", email: "ines.garnier@microshop.test" });
    expect(created.status).toBe(201);
    const userId: number = created.body.data.id;

    const accepted = await request(ordersApp).post("/api/orders").send({ userId, items });
    expect(accepted.status).toBe(201);

    await request(usersApp).patch(`/api/users/${userId}`).send({ status: "inactive" }).expect(200);

    const refused = await request(ordersApp).post("/api/orders").send({ userId, items });
    expect(refused.status).toBe(422);
    expect(refused.body.error.code).toBe("USER_INACTIVE");
  });
});

describe("passerelle Next.js → microservices (HTTP)", () => {
  it("GET /api/health : les deux services sont joignables", async () => {
    const res = await getHealth();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
  });

  it("GET /api/dashboard reflète l'état courant des deux services", async () => {
    const res = await getDashboard();
    const { data } = await res.json();

    expect(res.status).toBe(200);
    expect(data.users).toMatchObject({ total: 7, active: 5, inactive: 2 });
    expect(data.orders.total).toBe(10);
    expect(data.orders.byStatus.pending).toBe(4);
  });

  it("GET /api/gateway/users/[id] combine users-service et orders-service", async () => {
    const res = await getUserDetail(gatewayRequest("/api/gateway/users/2"), params("2"));
    const { data } = await res.json();

    expect(res.status).toBe(200);
    expect(data.user.name).toBe("Lucas Martin");
    expect(data.orders.map((order: { id: number }) => order.id)).toEqual([2, 3, 9]);
  });

  it("GET /api/gateway/orders/[id] enrichit la commande avec l'utilisateur", async () => {
    const res = await getOrderDetail(gatewayRequest("/api/gateway/orders/1"), params("1"));
    const { data } = await res.json();

    expect(res.status).toBe(200);
    expect(data.order.total).toBe(109.4);
    expect(data.user.name).toBe("Amina Benali");
  });

  it("GET /api/gateway/users/[id] relaie le 404 de users-service", async () => {
    const res = await getUserDetail(gatewayRequest("/api/gateway/users/404"), params("404"));

    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("USER_NOT_FOUND");
  });
});

describe("panne de users-service", () => {
  beforeAll(async () => {
    await stop(users);
  });

  it("orders-service répond 503 à la création de commande", async () => {
    const res = await request(ordersApp).post("/api/orders").send({ userId: 2, items });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("USERS_SERVICE_UNAVAILABLE");
  });

  it("GET /api/health signale un état dégradé (503)", async () => {
    const res = await getHealth();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.services["users-service"].status).toBe("down");
    expect(body.services["orders-service"].status).toBe("up");
  });

  it("GET /api/dashboard renvoie 502", async () => {
    const res = await getDashboard();

    expect(res.status).toBe(502);
  });
});
