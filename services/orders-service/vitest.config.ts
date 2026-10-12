import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "orders-service",
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
