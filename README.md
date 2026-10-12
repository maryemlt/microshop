# MicroShop

Petit back-office e-commerce : **une application Next.js** (App Router) et **deux microservices
Express**, en TypeScript strict. Le projet sert de **banc d'essai à Auto-Doc** : il est assez court
pour être lu en entier, mais déclare ses **18 endpoints REST** de plusieurs façons différentes.

Le projet est indépendant d'Auto-Doc : il n'en importe rien et n'en modifie rien.

| Application | Dossier | Port | Rôle |
|---|---|---|---|
| Users Service | `services/users-service` | 4101 | CRUD des utilisateurs, statistiques |
| Orders Service | `services/orders-service` | 4102 | CRUD des commandes, vérifie l'utilisateur via HTTP |
| Web + API Gateway | `apps/web` | 3000 | Interface et 4 Route Handlers d'agrégation |

Détails : [docs/architecture.md](docs/architecture.md) · inventaire des routes :
[docs/route-inventory.md](docs/route-inventory.md).

## Prérequis

- Node.js **20.9 ou plus récent** (testé avec Node 20.18 ; Node 22 ou 24 LTS recommandés)
- npm 10 ou plus récent
- Aucun compte, aucune base de données, aucun secret

## Démarrage (PowerShell)

```powershell
cd D:\autodoc-microservices-demo
npm install

# Facultatif : les valeurs par défaut conviennent déjà
Copy-Item .env.example .env

# Lance les 3 applications en parallèle (mode développement)
npm run dev
```

Ouvrir ensuite http://localhost:3000.

Pour lancer chaque application dans un terminal séparé :

```powershell
npm run dev:users    # http://localhost:4101
npm run dev:orders   # http://localhost:4102
npm run dev:web      # http://localhost:3000
```

Mode production :

```powershell
npm run build
npm start
```

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Les 3 applications en mode développement (`tsx watch`, `next dev`) |
| `npm run build` | Compile les services (`tsc` → `dist/`) et construit Next.js |
| `npm start` | Démarre les versions construites |
| `npm run typecheck` | Vérification TypeScript de chaque workspace et des tests racine |
| `npm test` | Tous les tests (Vitest : 4 projets) |

## Les 18 endpoints

**Users Service (4101)** : `GET /health/users` · `GET /api/users` · `GET /api/users/stats` ·
`GET /api/users/:id` · `POST /api/users` · `PATCH /api/users/:id` · `DELETE /api/users/:id`

**Orders Service (4102)** : `GET /health/orders` · `GET /api/orders` · `GET /api/orders/:id` ·
`POST /api/orders` · `PATCH /api/orders/:id/status` · `DELETE /api/orders/:id` ·
`GET /api/orders/by-user/:userId`

**Next.js API Gateway (3000)** : `GET /api/dashboard` · `GET /api/health` ·
`GET /api/gateway/users/[id]` · `GET /api/gateway/orders/[id]`

Exemples :

```powershell
Invoke-RestMethod http://localhost:4101/api/users?role=customer
Invoke-RestMethod http://localhost:4102/api/orders -Method Post -ContentType "application/json" `
  -Body '{"userId":2,"items":[{"product":"Hub USB","quantity":2,"unitPrice":19.9}]}'
Invoke-RestMethod http://localhost:3000/api/dashboard
```

Les réponses réussies ont la forme `{ "data": ... }` (plus `meta` pour les listes), les erreurs
`{ "error": { "code", "message", "details?" } }`. Les routes de santé renvoient un objet simple.

## Stockage en mémoire

Il n'y a **aucune base de données**. Chaque service garde ses données dans un tableau en mémoire
(`src/data/*.data.ts`), **réinitialisé à chaque redémarrage** : 6 utilisateurs (dont 1 inactif)
et 8 commandes. Toutes les modifications faites dans l'interface sont perdues à l'arrêt.

## Configuration

`.env.example` liste les ports, les URL internes (`USERS_SERVICE_URL`, `ORDERS_SERVICE_URL`), les
URL publiques pour le navigateur (`NEXT_PUBLIC_*`) et les origines CORS (`WEB_ORIGIN`). Le fichier
`.env` à la racine est lu par les deux services et par Next.js. Les variables `NEXT_PUBLIC_*` sont
intégrées au moment du build : il faut relancer `npm run build` après les avoir modifiées.

## Tests

```powershell
npm test
```

- **Microservices** : Vitest + Supertest sur les 7 routes de chaque service (200, 201, 204, 400,
  404, 409, 422, 502, 503 selon les cas). Dans les tests d'orders-service, users-service est
  simulé sur `fetch`.
- **Next.js** : les Route Handlers sont importés et appelés directement, avec des microservices
  simulés.
- **Intégration** : les deux services démarrent sur `127.0.0.1` (ports éphémères) ; on vérifie
  les appels HTTP réels orders → users et passerelle → services, puis le comportement quand
  users-service est arrêté.
- **Inventaire** : `tests/route-inventory.test.ts` lit les routes réellement enregistrées (pile
  du routeur Express, exports des `route.ts`) et exige une correspondance exacte avec
  `docs/route-inventory.json` : aucune route manquante, supplémentaire ou en double.

Aucun test n'appelle un service externe.

## Utiliser MicroShop pour évaluer Auto-Doc

1. Faire analyser le code par Auto-Doc **sans le dossier `docs/`**, qui contient la réponse
   attendue.
2. Normaliser les chemins extraits (`:id` et `[id]` → `{id}`, `:userId` → `{userId}`).
3. Comparer avec `docs/route-inventory.json` selon la clé `service + méthode + chemin normalisé`
   (le service est indispensable : `/health/users`, `/health/orders` et `/api/health` sont trois
   routes de trois services différents).

La méthode de calcul (précision, rappel) et les constructions les plus difficiles sont décrites
dans [docs/route-inventory.md](docs/route-inventory.md).

## Structure

```text
├── apps/web/                 # Next.js 16 : pages, Route Handlers, composants
│   ├── app/api/              # les 4 endpoints de la passerelle (route.ts)
│   ├── app/{users,orders}/   # pages de gestion
│   ├── components/           # tableau de bord, tableaux, formulaires
│   ├── lib/                  # clients HTTP (navigateur et serveur), types, formatage
│   └── tests/
├── services/
│   ├── users-service/src/    # app.ts, server.ts, routes, controllers, services, middleware, data
│   └── orders-service/src/   # idem, plus services/users.client.ts (appel inter-services)
├── tests/                    # intégration et contrôle de l'inventaire des routes
├── docs/                     # architecture et vérité terrain des routes
├── .env.example
└── package.json              # workspaces npm
```
