import { NextResponse } from "next/server";
import { buildOrderStats } from "@/lib/stats";
import type { DashboardData } from "@/lib/types";
import { fetchOrders, fetchUserStats, toErrorResponse } from "@/lib/upstream";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard
 * Agrège GET /api/users/stats (users-service) et GET /api/orders (orders-service).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const [userStats, orders] = await Promise.all([fetchUserStats(), fetchOrders()]);
    const data: DashboardData = {
      users: userStats,
      orders: buildOrderStats(orders),
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json({ data });
  } catch (error) {
    return toErrorResponse(error);
  }
}
