import express from "express";

export interface DeclaredRoute {
  method: string;
  path: string;
  /** Dernier handler de la pile de la route (le contrôleur). */
  handler: unknown;
}

const MOUNT_PATH = Symbol("microshop.mountPath");

interface RouteLike {
  path: string;
  methods: Record<string, boolean | undefined>;
  stack: { method?: string; handle: unknown }[];
}

interface LayerLike {
  route?: RouteLike;
  handle: unknown;
  [MOUNT_PATH]?: string;
}

interface RouterLike {
  stack: LayerLike[];
}

let mountPathsRecorded = false;

/**
 * Express 5 (router 2.x) ne conserve pas le chemin passé à `router.use(path, sousRouteur)`.
 * On l'enregistre sur chaque couche en enveloppant Router.prototype.use.
 * À appeler AVANT d'importer les applications Express.
 */
export function recordMountPaths(): void {
  if (mountPathsRecorded) return;
  mountPathsRecorded = true;

  const proto = express.Router.prototype as { use: (this: RouterLike, ...args: unknown[]) => unknown };
  const originalUse = proto.use;

  proto.use = function use(this: RouterLike, ...args: unknown[]) {
    const first = args[0];
    if (Array.isArray(first) && first.some((entry) => typeof entry === "string")) {
      throw new Error("Montage sur plusieurs chemins non pris en charge par l'inventaire.");
    }
    const mountPath = typeof first === "string" ? first : "/";
    const layerCount = this.stack.length;
    const result = originalUse.apply(this, args);
    for (const layer of this.stack.slice(layerCount)) layer[MOUNT_PATH] = mountPath;
    return result;
  };
}

function joinPaths(...segments: string[]): string {
  const joined = `/${segments.join("/")}`.replace(/\/{2,}/g, "/");
  return joined.length > 1 ? joined.replace(/\/$/, "") : joined;
}

function isRouter(handle: unknown): handle is RouterLike {
  return typeof handle === "function" && Array.isArray((handle as Partial<RouterLike>).stack);
}

/** Parcourt la pile du routeur racine et renvoie chaque couple (méthode, chemin public). */
export function listExpressRoutes(app: unknown): DeclaredRoute[] {
  const routes: DeclaredRoute[] = [];

  const visit = (router: RouterLike, prefix: string): void => {
    for (const layer of router.stack) {
      if (layer.route) {
        for (const [method, enabled] of Object.entries(layer.route.methods)) {
          if (!enabled) continue;
          const handlers = layer.route.stack.filter((routeLayer) => routeLayer.method === method);
          routes.push({
            method: method.toUpperCase(),
            path: joinPaths(prefix, layer.route.path),
            handler: handlers.at(-1)?.handle,
          });
        }
      } else if (isRouter(layer.handle)) {
        visit(layer.handle, joinPaths(prefix, layer[MOUNT_PATH] ?? "/"));
      }
    }
  };

  visit((app as { router: RouterLike }).router, "");
  return routes;
}
