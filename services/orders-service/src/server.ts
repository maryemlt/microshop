import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { app } from "./app.js";

// Fichier .env partagé à la racine du monorepo (optionnel).
const rootEnvFile = fileURLToPath(new URL("../../../.env", import.meta.url));
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

const port = Number(process.env.ORDERS_SERVICE_PORT ?? 4102);

app.listen(port, (error) => {
  if (error) throw error;
  console.log(`orders-service prêt sur http://localhost:${port}`);
  console.log(`→ users-service attendu sur ${process.env.USERS_SERVICE_URL ?? "http://localhost:4101"}`);
});
