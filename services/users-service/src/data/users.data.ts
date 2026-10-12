import type { User } from "../types.js";

/**
 * Stockage en mémoire assumé : aucune base de données.
 * Les données sont réinitialisées à chaque démarrage du service.
 */
const seedUsers: readonly User[] = [
  {
    id: 1,
    name: "Amina Benali",
    email: "amina.benali@microshop.test",
    role: "admin",
    status: "active",
    createdAt: "2026-01-05T09:00:00.000Z",
    updatedAt: "2026-01-05T09:00:00.000Z",
  },
  {
    id: 2,
    name: "Lucas Martin",
    email: "lucas.martin@microshop.test",
    role: "customer",
    status: "active",
    createdAt: "2026-01-12T14:30:00.000Z",
    updatedAt: "2026-01-12T14:30:00.000Z",
  },
  {
    id: 3,
    name: "Sofia Rossi",
    email: "sofia.rossi@microshop.test",
    role: "manager",
    status: "active",
    createdAt: "2026-02-03T08:15:00.000Z",
    updatedAt: "2026-02-03T08:15:00.000Z",
  },
  {
    id: 4,
    name: "Yanis Haddad",
    email: "yanis.haddad@microshop.test",
    role: "customer",
    status: "inactive",
    createdAt: "2026-02-20T17:45:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
  },
  {
    id: 5,
    name: "Chloé Dubois",
    email: "chloe.dubois@microshop.test",
    role: "customer",
    status: "active",
    createdAt: "2026-03-08T11:20:00.000Z",
    updatedAt: "2026-03-08T11:20:00.000Z",
  },
  {
    id: 6,
    name: "Omar Kacem",
    email: "omar.kacem@microshop.test",
    role: "customer",
    status: "active",
    createdAt: "2026-04-14T16:05:00.000Z",
    updatedAt: "2026-04-14T16:05:00.000Z",
  },
];

export const usersStore = {
  users: [] as User[],
  nextId: 1,
};

/** Restaure le jeu de données initial (utilisé au démarrage et par les tests). */
export function resetUsersData(): void {
  usersStore.users = seedUsers.map((user) => ({ ...user }));
  usersStore.nextId = Math.max(...seedUsers.map((user) => user.id)) + 1;
}

resetUsersData();
