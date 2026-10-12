# Inventaire des routes : vérité terrain

Ce document et [`route-inventory.json`](./route-inventory.json) décrivent **les 18 endpoints REST**
réellement exposés par MicroShop. Ils servent de référence indépendante pour mesurer la qualité
de l'extraction d'Auto-Doc.

> **Ne pas fournir ces fichiers à Auto-Doc.** Le moteur doit retrouver les routes à partir du code
> source uniquement (`services/*/src`, `apps/web/app`). Le dossier `docs/` doit être exclu de
> l'analyse, ou retiré d'une copie du dépôt.

La correspondance entre ce fichier et le code est vérifiée automatiquement par
[`tests/route-inventory.test.ts`](../tests/route-inventory.test.ts), qui lit les routes **à
l'exécution** (pile du routeur Express, exports des fichiers `route.ts`).

## Règles de comparaison

| Règle | Détail |
|---|---|
| Clé de comparaison | `service` + `method` + `normalizedPath` |
| Normalisation | `:id` → `{id}`, `:userId` → `{userId}`, `[id]` → `{id}` |
| Distinction des services | `/health/users` (4101), `/health/orders` (4102) et `/api/health` (3000) sont trois routes distinctes ; le nom du service est obligatoire dans la clé |
| Préfixes | Le chemin attendu est le chemin **public complet**, préfixes de montage inclus (`app.use('/api')` + `apiRouter.use('/users')` + `usersRouter.get('/:id')` → `/api/users/{id}`) |
| Hors périmètre | Middlewares globaux (`app.use(corsMiddleware)`, `notFoundHandler`, `errorHandler`), `router.param()`, réponses automatiques `OPTIONS`/`HEAD` d'Express, pages Next.js (`page.tsx`) : **aucun n'est un endpoint** |

## Users Service : 7 routes (port 4101)

| # | Méthode | Chemin normalisé | Fichier déclarant | Contrôleur | Construction |
|---|---|---|---|---|---|
| users-01 | GET | `/health/users` | `services/users-service/src/app.ts` | handler inline | `app.get()` direct |
| users-02 | GET | `/api/users` | `services/users-service/src/routes/users.routes.ts` | `listUsers` | `usersRouter.get('/')`, routeur imbriqué sous `/api` → `/users` |
| users-03 | GET | `/api/users/stats` | `services/users-service/src/routes/users.routes.ts` | `getUserStats` | `usersRouter.get('/stats')`, avant `/:id` |
| users-04 | GET | `/api/users/{id}` | `services/users-service/src/routes/users.routes.ts` | `getUserById` | `usersRouter.route('/:id').get()` |
| users-05 | POST | `/api/users` | `services/users-service/src/routes/users.routes.ts` | `createUser` | `usersRouter.post('/')` |
| users-06 | PATCH | `/api/users/{id}` | `services/users-service/src/routes/users.routes.ts` | `updateUser` | `usersRouter.route('/:id').patch()` |
| users-07 | DELETE | `/api/users/{id}` | `services/users-service/src/routes/users.routes.ts` | `deleteUser` | `usersRouter.route('/:id').delete()` |

Contrôleurs : `services/users-service/src/controllers/users.controller.ts`.

## Orders Service : 7 routes (port 4102)

| # | Méthode | Chemin normalisé | Fichier déclarant | Contrôleur | Construction |
|---|---|---|---|---|---|
| orders-01 | GET | `/health/orders` | `services/orders-service/src/routes/health.routes.ts` | `getHealth` | `healthRouter.get('/orders')` monté sur `/health` |
| orders-02 | GET | `/api/orders` | `services/orders-service/src/routes/orders.routes.ts` | `listOrders` | `ordersRouter.route('/').get()` |
| orders-03 | GET | `/api/orders/{id}` | `services/orders-service/src/routes/orders.routes.ts` | `getOrderById` | `ordersRouter.route('/:id').get()` |
| orders-04 | POST | `/api/orders` | `services/orders-service/src/routes/orders.routes.ts` | `createOrder` | `ordersRouter.route('/').post()`, appelle users-service |
| orders-05 | PATCH | `/api/orders/{id}/status` | `services/orders-service/src/routes/order-status.routes.ts` | `updateOrderStatus` | `orderStatusRouter.patch('/')`, routeur imbriqué monté sur `/:id/status` (`mergeParams`) |
| orders-06 | DELETE | `/api/orders/{id}` | `services/orders-service/src/routes/orders.routes.ts` | `deleteOrder` | `ordersRouter.route('/:id').delete()` |
| orders-07 | GET | `/api/orders/by-user/{userId}` | `services/orders-service/src/routes/orders.routes.ts` | `listOrdersByUser` | `ordersRouter.get('/by-user/:userId')` |

Contrôleurs : `services/orders-service/src/controllers/orders.controller.ts` et
`health.controller.ts` (pour `getHealth`).

## Next.js API Gateway : 4 routes (port 3000)

| # | Méthode | Chemin normalisé | Fichier déclarant | Appels sortants |
|---|---|---|---|---|
| gateway-01 | GET | `/api/dashboard` | `apps/web/app/api/dashboard/route.ts` | users `GET /api/users/stats`, orders `GET /api/orders` |
| gateway-02 | GET | `/api/health` | `apps/web/app/api/health/route.ts` | users `GET /health/users`, orders `GET /health/orders` |
| gateway-03 | GET | `/api/gateway/users/{id}` | `apps/web/app/api/gateway/users/[id]/route.ts` | users `GET /api/users/{id}`, orders `GET /api/orders/by-user/{userId}` |
| gateway-04 | GET | `/api/gateway/orders/{id}` | `apps/web/app/api/gateway/orders/[id]/route.ts` | orders `GET /api/orders/{id}`, users `GET /api/users/{id}` |

Ce sont des Route Handlers (`export async function GET`) : il n'y a pas de contrôleur séparé.

## Total

| Service | Attendues |
|---|---|
| users-service | 7 |
| orders-service | 7 |
| web-gateway | 4 |
| **Total** | **18** |

## Champs du fichier JSON

Chaque entrée de `routes[]` contient : `id`, `service`, `method`, `path` (syntaxe du framework),
`normalizedPath`, `description`, `sourceFile`, `declaration`, `mountChain` (chaîne de montage
complète), `middlewares`, `controller` (`{ file, handler }` ou `null`), `pathParams`,
`queryParams`, `bodyFields`, `statusCodes` (codes métier principaux, hors 500 générique) et
`calls` (appels HTTP vers d'autres services).

## Évaluer une sortie d'Auto-Doc

1. Normaliser chaque route extraite avec la règle ci-dessus et construire la clé
   `service method normalizedPath`.
2. **Vrais positifs** : clés présentes dans les deux ensembles. **Manquantes** : clés de
   l'inventaire absentes de la sortie. **Supplémentaires** : clés de la sortie absentes de
   l'inventaire (par exemple un middleware compté comme route, ou un préfixe mal reconstruit).
3. Précision = VP / (VP + supplémentaires) ; rappel = VP / 18.
4. Pour aller plus loin, comparer `sourceFile`, `controller.handler`, `pathParams`,
   `queryParams`, `bodyFields` et `calls`.

Les constructions les plus exigeantes pour un extracteur sont `orders-05` (routeur imbriqué avec
paramètre hérité), les trois routes `users-04/06/07` (déclarées en une seule chaîne `route()`),
`users-01` (handler inline) et les segments dynamiques `[id]` de Next.js.
