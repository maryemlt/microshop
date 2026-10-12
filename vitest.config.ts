import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const webAppDir = fileURLToPath(new URL("./apps/web", import.meta.url));

export default defineConfig({
  test: {
    projects: [
      "services/users-service",
      "services/orders-service",
      "apps/web",
      {
        resolve: { alias: { "@": webAppDir } },
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/**/*.test.ts"],
        },
      },
    ],
  },
});
