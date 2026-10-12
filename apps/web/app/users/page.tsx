import type { Metadata } from "next";
import { UsersManager } from "@/components/UsersManager";

export const metadata: Metadata = { title: "Utilisateurs" };

export default function UsersPage() {
  return <UsersManager />;
}
