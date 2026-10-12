import { readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const HTTP_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

export interface NextRouteHandler {
  method: string;
  /** Chemin public, segments dynamiques conservés : /api/gateway/users/[id]. */
  path: string;
  file: string;
}

/**
 * Recense les Route Handlers de l'App Router : chaque fichier route.ts expose
 * une route par fonction exportée nommée d'après une méthode HTTP.
 * Les groupes "(nom)" et les slots "@nom" ne font pas partie de l'URL.
 */
export async function listNextRouteHandlers(appDir: string): Promise<NextRouteHandler[]> {
  const routeFiles = readdirSync(appDir, { recursive: true, encoding: "utf8" }).filter((entry) =>
    /(^|[\\/])route\.(ts|tsx|js|mjs)$/.test(entry),
  );

  const handlers: NextRouteHandler[] = [];
  for (const entry of routeFiles) {
    const segments = path
      .dirname(entry)
      .split(/[\\/]/)
      .filter((segment) => segment !== "." && !/^\(.+\)$/.test(segment) && !segment.startsWith("@"));
    const file = path.join(appDir, entry);
    const routeModule = (await import(pathToFileURL(file).href)) as Record<string, unknown>;

    for (const method of HTTP_METHODS) {
      if (typeof routeModule[method] === "function") {
        handlers.push({ method, path: `/${segments.join("/")}`, file });
      }
    }
  }
  return handlers;
}
