const trimTrailingSlash = (url: string): string => url.replace(/\/+$/, "");

/** URL internes des microservices, lues à chaque appel par les Route Handlers (côté serveur). */
export function getUpstreamUrls(): { users: string; orders: string } {
  return {
    users: trimTrailingSlash(process.env.USERS_SERVICE_URL ?? "http://localhost:4101"),
    orders: trimTrailingSlash(process.env.ORDERS_SERVICE_URL ?? "http://localhost:4102"),
  };
}

/** URL des microservices appelées depuis le navigateur (NEXT_PUBLIC_* intégrées au build). */
export const publicServiceUrls = {
  users: trimTrailingSlash(process.env.NEXT_PUBLIC_USERS_SERVICE_URL ?? "http://localhost:4101"),
  orders: trimTrailingSlash(process.env.NEXT_PUBLIC_ORDERS_SERVICE_URL ?? "http://localhost:4102"),
};
