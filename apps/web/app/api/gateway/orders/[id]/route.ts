import { NextResponse } from "next/server";
import type { OrderDetail } from "@/lib/types";
import { errorResponse, fetchOrder, findUser, parseId, toErrorResponse } from "@/lib/upstream";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/gateway/orders/[id]
 * Lit GET /api/orders/:id (orders-service) puis enrichit avec GET /api/users/:id (users-service).
 */
export async function GET(_request: Request, { params }: RouteContext): Promise<NextResponse> {
  const { id } = await params;
  const orderId = parseId(id);
  if (orderId === null) {
    return errorResponse(400, "INVALID_ID", `L'identifiant « ${id} » doit être un entier positif.`);
  }

  try {
    const order = await fetchOrder(orderId);
    const data: OrderDetail = { order, user: await findUser(order.userId) };
    return NextResponse.json({ data });
  } catch (error) {
    return toErrorResponse(error);
  }
}
