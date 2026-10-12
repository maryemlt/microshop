import type { Order } from "../types.js";

/**
 * Stockage en mémoire assumé : aucune base de données.
 * Les userId font référence aux utilisateurs initiaux de users-service.
 */
const seedOrders: readonly Order[] = [
  {
    id: 1,
    userId: 1,
    items: [
      { product: "Clavier mécanique", quantity: 1, unitPrice: 89.9 },
      { product: "Tapis de souris XL", quantity: 1, unitPrice: 19.5 },
    ],
    total: 109.4,
    status: "delivered",
    createdAt: "2026-05-02T10:12:00.000Z",
    updatedAt: "2026-05-06T15:40:00.000Z",
  },
  {
    id: 2,
    userId: 2,
    items: [{ product: "Écran 27 pouces", quantity: 2, unitPrice: 249 }],
    total: 498,
    status: "shipped",
    createdAt: "2026-05-18T09:30:00.000Z",
    updatedAt: "2026-05-19T08:00:00.000Z",
  },
  {
    id: 3,
    userId: 2,
    items: [{ product: "Câble USB-C", quantity: 3, unitPrice: 12.9 }],
    total: 38.7,
    status: "paid",
    createdAt: "2026-06-01T13:05:00.000Z",
    updatedAt: "2026-06-01T13:06:00.000Z",
  },
  {
    id: 4,
    userId: 3,
    items: [{ product: "Casque audio", quantity: 1, unitPrice: 129.99 }],
    total: 129.99,
    status: "pending",
    createdAt: "2026-06-11T17:22:00.000Z",
    updatedAt: "2026-06-11T17:22:00.000Z",
  },
  {
    id: 5,
    userId: 5,
    items: [
      { product: "Webcam HD", quantity: 1, unitPrice: 59.9 },
      { product: "Micro USB", quantity: 1, unitPrice: 74.5 },
    ],
    total: 134.4,
    status: "pending",
    createdAt: "2026-07-03T08:48:00.000Z",
    updatedAt: "2026-07-03T08:48:00.000Z",
  },
  {
    id: 6,
    userId: 6,
    items: [{ product: "Station d'accueil USB-C", quantity: 1, unitPrice: 149 }],
    total: 149,
    status: "cancelled",
    createdAt: "2026-07-21T19:10:00.000Z",
    updatedAt: "2026-07-22T09:00:00.000Z",
  },
  {
    id: 7,
    userId: 1,
    items: [{ product: "Souris sans fil", quantity: 2, unitPrice: 34.95 }],
    total: 69.9,
    status: "paid",
    createdAt: "2026-08-09T11:00:00.000Z",
    updatedAt: "2026-08-09T11:02:00.000Z",
  },
  {
    id: 8,
    userId: 4,
    items: [{ product: "Lampe de bureau LED", quantity: 1, unitPrice: 45 }],
    total: 45,
    status: "delivered",
    createdAt: "2026-02-25T14:35:00.000Z",
    updatedAt: "2026-03-01T09:15:00.000Z",
  },
];

export const ordersStore = {
  orders: [] as Order[],
  nextId: 1,
};

/** Restaure le jeu de données initial (utilisé au démarrage et par les tests). */
export function resetOrdersData(): void {
  ordersStore.orders = seedOrders.map((order) => ({ ...order, items: order.items.map((item) => ({ ...item })) }));
  ordersStore.nextId = Math.max(...seedOrders.map((order) => order.id)) + 1;
}

resetOrdersData();
