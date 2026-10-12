import type { Metadata } from "next";
import { OrdersManager } from "@/components/OrdersManager";

export const metadata: Metadata = { title: "Commandes" };

export default function OrdersPage() {
  return <OrdersManager />;
}
