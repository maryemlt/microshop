import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { resetUsersData } from "../src/data/users.data.js";

beforeEach(() => {
  resetUsersData();
});

describe("GET /health/users", () => {
  it("indique que le service est opérationnel", async () => {
    const res = await request(app).get("/health/users");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ service: "users-service", status: "ok" });
  });
});

describe("GET /api/users", () => {
  it("liste les 6 utilisateurs du jeu de données", async () => {
    const res = await request(app).get("/api/users");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(6);
    expect(res.body.meta).toEqual({ count: 6 });
  });

  it("filtre par rôle et par statut (paramètres de requête)", async () => {
    const res = await request(app).get("/api/users").query({ role: "customer", status: "active" });

    expect(res.status).toBe(200);
    expect(res.body.data.map((user: { id: number }) => user.id)).toEqual([2, 5, 6]);
  });

  it("recherche sans tenir compte de la casse", async () => {
    const res = await request(app).get("/api/users?search=ROSSI");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Sofia Rossi");
  });

  it("refuse un rôle inconnu avec 400", async () => {
    const res = await request(app).get("/api/users?role=superuser");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toHaveProperty("role");
  });
});

describe("GET /api/users/stats", () => {
  it("calcule les statistiques", async () => {
    const res = await request(app).get("/api/users/stats");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      total: 6,
      active: 5,
      inactive: 1,
      byRole: { admin: 1, manager: 1, customer: 4 },
    });
  });
});

describe("GET /api/users/:id", () => {
  it("renvoie l'utilisateur demandé", async () => {
    const res = await request(app).get("/api/users/3");

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 3, name: "Sofia Rossi", role: "manager" });
  });

  it("renvoie 404 pour un identifiant inconnu", async () => {
    const res = await request(app).get("/api/users/999");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("USER_NOT_FOUND");
  });

  it("renvoie 400 pour un identifiant non numérique", async () => {
    const res = await request(app).get("/api/users/abc");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_ID");
  });
});

describe("POST /api/users", () => {
  it("crée un utilisateur (201) avec les valeurs par défaut", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ name: "  Nora Petit ", email: "Nora.Petit@microshop.test" });

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe("/api/users/7");
    expect(res.body.data).toMatchObject({
      id: 7,
      name: "Nora Petit",
      email: "nora.petit@microshop.test",
      role: "customer",
      status: "active",
    });

    const list = await request(app).get("/api/users");
    expect(list.body.data).toHaveLength(7);
  });

  it("renvoie 400 si les champs obligatoires sont absents ou invalides", async () => {
    const res = await request(app).post("/api/users").send({ name: "A", role: "root", age: 30 });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual({
      name: "Le nom doit contenir au moins 2 caractères.",
      email: "L'adresse e-mail est obligatoire.",
      role: "Valeurs autorisées : admin, manager, customer.",
      age: "Champ non reconnu.",
    });
  });

  it("renvoie 400 pour un JSON mal formé", async () => {
    const res = await request(app).post("/api/users").set("Content-Type", "application/json").send("{ name: ");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });

  it("renvoie 409 si l'e-mail est déjà utilisé", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ name: "Doublon", email: "lucas.martin@microshop.test" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_ALREADY_USED");
  });
});

describe("PATCH /api/users/:id", () => {
  it("modifie partiellement un utilisateur", async () => {
    const res = await request(app).patch("/api/users/4").send({ status: "active", role: "manager" });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 4, status: "active", role: "manager", name: "Yanis Haddad" });

    const stats = await request(app).get("/api/users/stats");
    expect(stats.body.data.active).toBe(6);
  });

  it("renvoie 400 si aucun champ n'est fourni", async () => {
    const res = await request(app).patch("/api/users/1").send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("EMPTY_UPDATE");
  });

  it("renvoie 400 pour un statut invalide", async () => {
    const res = await request(app).patch("/api/users/1").send({ status: "banned" });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty("status");
  });

  it("renvoie 404 pour un utilisateur inconnu", async () => {
    const res = await request(app).patch("/api/users/999").send({ name: "Personne" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/users/:id", () => {
  it("supprime l'utilisateur (204) puis renvoie 404", async () => {
    const res = await request(app).delete("/api/users/2");
    expect(res.status).toBe(204);

    const after = await request(app).get("/api/users/2");
    expect(after.status).toBe(404);
  });

  it("renvoie 404 pour un utilisateur inconnu", async () => {
    const res = await request(app).delete("/api/users/999");

    expect(res.status).toBe(404);
  });
});

describe("routes non déclarées et CORS", () => {
  it("renvoie 404 JSON pour une route inexistante", async () => {
    const res = await request(app).put("/api/users/1").send({ name: "Remplacement" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
  });

  it("répond au pré-vol CORS pour l'origine du frontend", async () => {
    const res = await request(app)
      .options("/api/users/1")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "PATCH");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(res.headers["access-control-allow-methods"]).toContain("PATCH");
  });
});
