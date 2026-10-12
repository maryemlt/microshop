export const USER_ROLES = ["admin", "manager", "customer"] as const;
export const USER_STATUSES = ["active", "inactive"] as const;
export const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;
export const FINAL_ORDER_STATUSES: readonly OrderStatus[] = ["delivered", "cancelled"];

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type ServiceName = "users-service" | "orders-service";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export type UserInput = Pick<User, "name" | "email" | "role" | "status">;

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<UserRole, number>;
}

export interface OrderItem {
  product: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: number;
  userId: number;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface NewOrderInput {
  userId: number;
  items: OrderItem[];
}

export interface OrderStats {
  total: number;
  /** Somme des commandes non annulées. */
  revenue: number;
  billableOrders: number;
  averageOrderValue: number;
  byStatus: Record<OrderStatus, number>;
  recent: Order[];
}

/** Réponse de GET /api/dashboard. */
export interface DashboardData {
  users: UserStats;
  orders: OrderStats;
  generatedAt: string;
}

export interface ServiceHealth {
  status: "up" | "down";
  latencyMs: number;
  httpStatus?: number;
  error?: string;
}

/** Réponse de GET /api/health (HTTP 200 si tout va bien, 503 sinon). */
export interface HealthReport {
  status: "ok" | "degraded";
  services: Record<ServiceName, ServiceHealth>;
  checkedAt: string;
}

/** Réponse de GET /api/gateway/users/[id]. */
export interface UserDetail {
  user: User;
  orders: Order[];
  totalSpent: number;
}

/** Réponse de GET /api/gateway/orders/[id] ; user est null si l'utilisateur a été supprimé. */
export interface OrderDetail {
  order: Order;
  user: User | null;
}

export interface DataResponse<T> {
  data: T;
}

export interface ListResponse<T> {
  data: T[];
  meta: { count: number };
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, string> };
}
