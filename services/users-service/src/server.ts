import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { app } from "./app.js";

// Fichier .env partagé à la racine du monorepo (optionnel).
const rootEnvFile = fileURLToPath(new URL("../../../.env", import.meta.url));
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

const port = Number(process.env.USERS_SERVICE_PORT ?? 4101);

app.listen(port, (error) => {
  if (error) throw error;
  console.log(`users-service prêt sur http://localhost:${port}`);
});
