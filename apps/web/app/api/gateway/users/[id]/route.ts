import { NextResponse } from "next/server";
import { sumBillable } from "@/lib/stats";
import type { UserDetail } from "@/lib/types";
import { errorResponse, fetchOrdersByUser, fetchUser, parseId, toErrorResponse } from "@/lib/upstream";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/gateway/users/[id]
 * Combine GET /api/users/:id (users-service) et GET /api/orders/by-user/:userId (orders-service).
 */
export async function GET(_request: Request, { params }: RouteContext): Promise<NextResponse> {
  const { id } = await params;
  const userId = parseId(id);
  if (userId === null) {
    return errorResponse(400, "INVALID_ID", `L'identifiant « ${id} » doit être un entier positif.`);
  }

  try {
    const [user, orders] = await Promise.all([fetchUser(userId), fetchOrdersByUser(userId)]);
    const data: UserDetail = { user, orders, totalSpent: sumBillable(orders) };
    return NextResponse.json({ data });
  } catch (error) {
    return toErrorResponse(error);
  }
}
