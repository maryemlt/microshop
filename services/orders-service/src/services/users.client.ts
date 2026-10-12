import { HttpError } from "../errors.js";
import type { RemoteUser } from "../types.js";

const DEFAULT_USERS_SERVICE_URL = "http://localhost:4101";
const REQUEST_TIMEOUT_MS = 3000;

function usersServiceUrl(): string {
  return (process.env.USERS_SERVICE_URL ?? DEFAULT_USERS_SERVICE_URL).replace(/\/+$/, "");
}

/**
 * Appel HTTP inter-services : GET {USERS_SERVICE_URL}/api/users/:id.
 * Renvoie null si l'utilisateur n'existe pas.
 */
export async function fetchUser(userId: number): Promise<RemoteUser | null> {
  let response: Response;
  try {
    response = await fetch(`${usersServiceUrl()}/api/users/${userId}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new HttpError(503, "USERS_SERVICE_UNAVAILABLE", "Le service utilisateurs est injoignable.");
  }

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new HttpError(502, "USERS_SERVICE_ERROR", `Réponse inattendue du service utilisateurs (HTTP ${response.status}).`);
  }

  const body = (await response.json()) as { data: RemoteUser };
  return body.data;
}
