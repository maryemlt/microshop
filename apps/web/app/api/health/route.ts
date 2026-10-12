import { NextResponse } from "next/server";
import type { HealthReport } from "@/lib/types";
import { checkHealth } from "@/lib/upstream";

export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * Interroge GET /health/users et GET /health/orders ; 503 si un service est indisponible.
 */
export async function GET(): Promise<NextResponse> {
  const [users, orders] = await Promise.all([checkHealth("users-service"), checkHealth("orders-service")]);
  const healthy = users.status === "up" && orders.status === "up";

  const report: HealthReport = {
    status: healthy ? "ok" : "degraded",
    services: { "users-service": users, "orders-service": orders },
    checkedAt: new Date().toISOString(),
  };
  return NextResponse.json(report, { status: healthy ? 200 : 503 });
}
