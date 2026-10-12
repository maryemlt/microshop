import { usersStore } from "../data/users.data.js";
import { HttpError } from "../errors.js";
import type { CreateUserInput, UpdateUserInput, User, UserFilters, UserStats } from "../types.js";

export function findUsers(filters: UserFilters): User[] {
  const search = filters.search?.toLowerCase();

  return usersStore.users.filter(
    (user) =>
      (!search || user.name.toLowerCase().includes(search) || user.email.includes(search)) &&
      (!filters.role || user.role === filters.role) &&
      (!filters.status || user.status === filters.status),
  );
}

export function computeUserStats(): UserStats {
  const stats: UserStats = {
    total: usersStore.users.length,
    active: 0,
    inactive: 0,
    byRole: { admin: 0, manager: 0, customer: 0 },
  };

  for (const user of usersStore.users) {
    stats.byRole[user.role] += 1;
    stats[user.status] += 1;
  }
  return stats;
}

export function findUserById(id: number): User {
  const user = usersStore.users.find((candidate) => candidate.id === id);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", `Utilisateur ${id} introuvable.`);
  }
  return user;
}

function assertEmailAvailable(email: string, ignoredUserId?: number): void {
  const taken = usersStore.users.some((user) => user.email === email && user.id !== ignoredUserId);
  if (taken) {
    throw new HttpError(409, "EMAIL_ALREADY_USED", `L'adresse ${email} est déjà utilisée.`);
  }
}

export function createUser(input: CreateUserInput): User {
  assertEmailAvailable(input.email);

  const now = new Date().toISOString();
  const user: User = { id: usersStore.nextId++, ...input, createdAt: now, updatedAt: now };
  usersStore.users.push(user);
  return user;
}

export function updateUser(id: number, changes: UpdateUserInput): User {
  const user = findUserById(id);
  if (changes.email) {
    assertEmailAvailable(changes.email, id);
  }

  Object.assign(user, changes, { updatedAt: new Date().toISOString() });
  return user;
}

export function deleteUser(id: number): void {
  const index = usersStore.users.findIndex((user) => user.id === id);
  if (index === -1) {
    throw new HttpError(404, "USER_NOT_FOUND", `Utilisateur ${id} introuvable.`);
  }
  usersStore.users.splice(index, 1);
}
