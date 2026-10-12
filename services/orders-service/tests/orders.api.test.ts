import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { app } from "../src/app.js";
import { resetOrdersData } from "../src/data/orders.data.js";
import type { RemoteUser } from "../src/types.js";

const USERS_SERVICE_URL = "http://users-service.test";

const remoteUsers: Record<number, RemoteUser> = {
  2: { id: 2, name: "Lucas Martin", email: "lucas.martin@microshop.test", status: "active" },
  4: { id: 4, name: "Yanis Haddad", email: "yanis.haddad@microshop.test", status: "inactive" },
};

/** Faux users-service : toute URL inattendue fait échouer le test (aucun appel réseau réel). */
async function fakeUsersService(input: string | URL | Request): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : input);
  if (url.origin !== USERS_SERVICE_URL) throw new Error(`Appel externe inattendu : ${url.href}`);

  const userId = Number(url.pathname.match(/^\/api\/users\/(\d+)$/)?.[1]);
  const user = remoteUsers[userId];
  return user
    ? Response.json({ data: user })
    : Response.json({ error: { code: "USER_NOT_FOUND", message: "introuvable" } }, { status: 404 });
}

let fetchSpy: MockInstance<typeof fetch>;

beforeEach(() => {
  resetOrdersData();
  vi.stubEnv("USERS_SERVICE_URL", USERS_SERVICE_URL);
  fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(fakeUsersService);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const validOrder = {
  userId: 2,
  items: [
    { product: "Clavier sans fil", quantity: 2, unitPrice: 39.99 },
    { product: "Hub USB", quantity: 1, unitPrice: 25.5 },
  ],
};

describe("GET /health/orders", () => {
  it("indique que le service est opérationnel", async () => {
    const res = await request(app).get("/health/orders");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ service: "orders-service", status: "ok", orders: 8 });
  });
});

describe("GET /api/orders", () => {
  it("liste les 8 commandes du jeu de données", async () => {
    const res = await request(app).get("/api/orders");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(8);
    expect(res.body.meta).toEqual({ count: 8 });
  });

  it("filtre par statut et limite le nombre de résultats", async () => {
    const pending = await request(app).get("/api/orders").query({ status: "pending" });
    expect(pending.body.data.map((order: { id: number }) => order.id)).toEqual([4, 5]);

    const limited = await request(app).get("/api/orders?limit=3");
    expect(limited.body.data).toHaveLength(3);
  });

  it("renvoie 400 pour un filtre invalide", async () => {
    const res = await request(app).get("/api/orders?status=lost&limit=0");

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.details)).toEqual(["status", "limit"]);
  });
});

describe("GET /api/orders/:id", () => {
  it("renvoie la commande demandée", async () => {
    const res = await request(app).get("/api/orders/2");

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 2, userId: 2, total: 498, status: "shipped" });
  });

  it("renvoie 404 pour une commande inconnue", async () => {
    const res = await request(app).get("/api/orders/999");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("ORDER_NOT_FOUND");
  });

  it("renvoie 400 pour un identifiant invalide", async () => {
    const res = await request(app).get("/api/orders/abc");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_PARAM");
  });
});

describe("GET /api/orders/by-user/:userId", () => {
  it("renvoie les commandes d'un utilisateur", async () => {
    const res = await request(app).get("/api/orders/by-user/2");

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ userId: 2, count: 2 });
    expect(res.body.data.map((order: { id: number }) => order.id)).toEqual([2, 3]);
  });

  it("renvoie une liste vide pour un utilisateur sans commande", async () => {
    const res = await request(app).get("/api/orders/by-user/42");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("renvoie 400 si userId n'est pas un entier", async () => {
    const res = await request(app).get("/api/orders/by-user/zero");

    expect(res.status).toBe(400);
  });
});

describe("POST /api/orders", () => {
  it("crée la commande (201) après vérification HTTP de l'utilisateur", async () => {
    const res = await request(app).post("/api/orders").send(validOrder);

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe("/api/orders/9");
    expect(res.body.data).toMatchObject({ id: 9, userId: 2, total: 105.48, status: "pending" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(`${USERS_SERVICE_URL}/api/users/2`);

    const byUser = await request(app).get("/api/orders/by-user/2");
    expect(byUser.body.meta.count).toBe(3);
  });

  it("renvoie 400 pour un corps invalide sans appeler users-service", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ userId: "2", items: [{ product: "X", quantity: 0, unitPrice: -1 }] });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual({
      userId: "userId doit être un entier positif.",
      "items[0].product": "Le nom du produit doit contenir au moins 2 caractères.",
      "items[0].quantity": "La quantité doit être un entier entre 1 et 99.",
      "items[0].unitPrice": "Le prix unitaire doit être compris entre 0 et 10 000.",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renvoie 422 si l'utilisateur n'existe pas dans users-service", async () => {
    const res = await request(app).post("/api/orders").send({ ...validOrder, userId: 99 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("USER_NOT_FOUND");
  });

  it("renvoie 422 si l'utilisateur est inactif", async () => {
    const res = await request(app).post("/api/orders").send({ ...validOrder, userId: 4 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("USER_INACTIVE");
  });

  it("renvoie 503 si users-service est injoignable", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError("fetch failed"));

    const res = await request(app).post("/api/orders").send(validOrder);

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("USERS_SERVICE_UNAVAILABLE");
  });

  it("renvoie 502 si users-service répond en erreur", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("boom", { status: 500 }));

    const res = await request(app).post("/api/orders").send(validOrder);

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe("USERS_SERVICE_ERROR");
  });
});

describe("PATCH /api/orders/:id/status", () => {
  it("modifie le statut de la commande", async () => {
    const res = await request(app).patch("/api/orders/4/status").send({ status: "paid" });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 4, status: "paid" });
  });

  it("renvoie 400 pour un statut inconnu", async () => {
    const res = await request(app).patch("/api/orders/4/status").send({ status: "lost" });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty("status");
  });

  it("renvoie 400 pour un identifiant invalide (paramètre fusionné du routeur parent)", async () => {
    const res = await request(app).patch("/api/orders/abc/status").send({ status: "paid" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_PARAM");
  });

  it("renvoie 404 pour une commande inconnue", async () => {
    const res = await request(app).patch("/api/orders/999/status").send({ status: "paid" });

    expect(res.status).toBe(404);
  });

  it("renvoie 409 pour une commande déjà livrée", async () => {
    const res = await request(app).patch("/api/orders/1/status").send({ status: "pending" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ORDER_STATUS_LOCKED");
  });
});

describe("DELETE /api/orders/:id", () => {
  it("supprime la commande (204) puis renvoie 404", async () => {
    const res = await request(app).delete("/api/orders/3");
    expect(res.status).toBe(204);

    const after = await request(app).get("/api/orders/3");
    expect(after.status).toBe(404);
  });

  it("renvoie 404 pour une commande inconnue", async () => {
    const res = await request(app).delete("/api/orders/999");

    expect(res.status).toBe(404);
  });
});

describe("routes non déclarées", () => {
  it("renvoie 404 JSON pour GET /api/orders/1/status (seul PATCH existe)", async () => {
    const res = await request(app).get("/api/orders/1/status");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
  });
});
