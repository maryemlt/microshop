import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { listExpressRoutes, recordMountPaths, type DeclaredRoute } from "./helpers/express-routes";
import { listNextRouteHandlers } from "./helpers/next-routes";

type ServiceName = "users-service" | "orders-service" | "web-gateway";

interface InventoryRoute {
  id: string;
  service: ServiceName;
  method: string;
  path: string;
  normalizedPath: string;
  sourceFile: string;
  controller: { file: string; handler: string } | null;
}

interface RouteInventory {
  totalRoutes: number;
  services: { name: ServiceName; expectedRoutes: number }[];
  routes: InventoryRoute[];
}

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const inventory = JSON.parse(readFileSync(path.join(ROOT, "docs/route-inventory.json"), "utf8")) as RouteInventory;

/** Normalisation de comparaison : ":id" et "[id]" deviennent "{id}". */
function normalizePath(routePath: string): string {
  return routePath.replace(/:([A-Za-z_]\w*)/g, "{$1}").replace(/\[([A-Za-z_]\w*)\]/g, "{$1}");
}

const routeKey = (method: string, routePath: string): string => `${method} ${normalizePath(routePath)}`;

const inventoryFor = (service: ServiceName) => inventory.routes.filter((route) => route.service === service);

let declared: Record<ServiceName, DeclaredRoute[]>;

beforeAll(async () => {
  // Doit précéder l'import des applications Express.
  recordMountPaths();
  const { app: usersApp } = await import("../services/users-service/src/app");
  const { app: ordersApp } = await import("../services/orders-service/src/app");
  const nextHandlers = await listNextRouteHandlers(path.join(ROOT, "apps/web/app"));

  declared = {
    "users-service": listExpressRoutes(usersApp),
    "orders-service": listExpressRoutes(ordersApp),
    "web-gateway": nextHandlers.map(({ method, path: routePath, file }) => ({ method, path: routePath, handler: file })),
  };
});

describe("docs/route-inventory.json", () => {
  it("contient exactement 18 routes uniques : 7 + 7 + 4", () => {
    const keys = inventory.routes.map((route) => `${route.service} ${routeKey(route.method, route.path)}`);

    expect(inventory.totalRoutes).toBe(18);
    expect(inventory.routes).toHaveLength(18);
    expect(new Set(keys).size).toBe(18);
    expect(new Set(inventory.routes.map((route) => route.id)).size).toBe(18);
    for (const service of inventory.services) {
      expect(inventoryFor(service.name), service.name).toHaveLength(service.expectedRoutes);
    }
  });

  it("normalizedPath applique la règle de normalisation", () => {
    for (const route of inventory.routes) {
      expect(route.normalizedPath, route.id).toBe(normalizePath(route.path));
    }
  });

  it("référence des fichiers sources existants", () => {
    for (const route of inventory.routes) {
      expect(existsSync(path.join(ROOT, route.sourceFile)), `${route.id} → ${route.sourceFile}`).toBe(true);
    }
  });
});

describe("correspondance code ↔ inventaire", () => {
  it.each(["users-service", "orders-service", "web-gateway"] as const)(
    "%s : aucune route manquante ni supplémentaire",
    (service) => {
      const actual = declared[service].map((route) => routeKey(route.method, route.path)).sort();
      const expected = inventoryFor(service).map((route) => routeKey(route.method, route.path)).sort();

      expect({
        missing: expected.filter((key) => !actual.includes(key)),
        extra: actual.filter((key) => !expected.includes(key)),
        duplicates: actual.filter((key, index) => actual.indexOf(key) !== index),
      }).toEqual({ missing: [], extra: [], duplicates: [] });
    },
  );

  it("18 routes déclarées au total dans le code", () => {
    const total = Object.values(declared).reduce((sum, routes) => sum + routes.length, 0);

    expect(total).toBe(18);
  });

  it("chaque route Express est servie par le contrôleur indiqué dans l'inventaire", async () => {
    for (const route of inventory.routes.filter((entry) => entry.service !== "web-gateway")) {
      const registered = declared[route.service].find(
        (candidate) => routeKey(candidate.method, candidate.path) === routeKey(route.method, route.path),
      );

      if (route.controller) {
        const controllerModule = (await import(pathToFileURL(path.join(ROOT, route.controller.file)).href)) as Record<
          string,
          unknown
        >;
        expect(typeof controllerModule[route.controller.handler], route.id).toBe("function");
        expect(registered?.handler, route.id).toBe(controllerModule[route.controller.handler]);
      } else {
        // Handler inline (fonction anonyme déclarée directement dans app.get).
        expect((registered?.handler as { name?: string } | undefined)?.name, route.id).toBe("");
      }
    }
  });

  it("chaque Route Handler Next.js est déclaré dans le fichier indiqué", () => {
    for (const route of inventoryFor("web-gateway")) {
      const registered = declared["web-gateway"].find(
        (candidate) => routeKey(candidate.method, candidate.path) === routeKey(route.method, route.path),
      );

      expect(registered?.handler, route.id).toBe(path.join(ROOT, route.sourceFile));
    }
  });

  it("n'utilise ni Pages Router ni rewrites qui exposeraient d'autres endpoints", () => {
    const nextConfig = readFileSync(path.join(ROOT, "apps/web/next.config.ts"), "utf8");

    expect(existsSync(path.join(ROOT, "apps/web/pages"))).toBe(false);
    expect(nextConfig).not.toMatch(/rewrites|redirects/);
  });
});
