export const USER_ROLES = ["admin", "manager", "customer"] as const;
export const USER_STATUSES = ["active", "inactive"] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export type UpdateUserInput = Partial<CreateUserInput>;

export interface UserFilters {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<UserRole, number>;
}

declare global {
  namespace Express {
    interface Locals {
      /** Filtres validés par validateListUsersQuery. */
      userFilters?: UserFilters;
    }
  }
}
